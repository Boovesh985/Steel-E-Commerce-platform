/**
 * Payment controller — Razorpay order creation and verification.
 */
const { authPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const paymentService = require('../services/payment.service');
const { sendOrderReceiptEmail } = require('../services/email.service');

// POST /api/payments/create-order
async function createPaymentOrder(req, res, next) {
  try {
    const { orderId } = req.body;
    if (!orderId) throw new AppError(400, 'VALIDATION_ERROR', 'orderId is required.');

    const order = await authPrisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    if (order.userId !== req.user.id) throw new AppError(403, 'FORBIDDEN', 'Access denied.');
    if (order.paymentStatus === 'PAID') throw new AppError(400, 'ALREADY_PAID', 'Order is already paid.');

    // Convert totalAmount to paise (₹1 = 100 paise)
    const amountInPaise = Math.round(Number(order.totalAmount) * 100);

    const rzpOrder = await paymentService.createRazorpayOrder(amountInPaise, order.orderNumber);

    // Store razorpay order ID on our order
    await authPrisma.order.update({
      where: { id: orderId },
      data: { razorpayOrderId: rzpOrder.id },
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/payments/verify
async function verifyPayment(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Missing payment verification fields.');
    }

    const isValid = paymentService.verifyPaymentSignature(
      razorpay_order_id, razorpay_payment_id, razorpay_signature
    );

    if (!isValid) {
      throw new AppError(400, 'PAYMENT_VERIFICATION_FAILED', 'Payment signature verification failed.');
    }

    // Find the order by razorpay order ID or orderId
    const where = orderId ? { id: orderId } : { razorpayOrderId: razorpay_order_id };
    const order = await authPrisma.order.findFirst({ where });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.');

    // Verify ownership — prevent any user from confirming another user's payment
    if (order.userId !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this order.');
    }

    // Update order payment status
    const updated = await authPrisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        paymentId: razorpay_payment_id,
        status: 'CONFIRMED',
        trackingEvents: {
          create: { status: 'CONFIRMED', note: 'Payment received and verified' },
        },
      },
      include: { items: true, trackingEvents: { orderBy: { timestamp: 'asc' } } },
    });

    // Send billing receipt email (fire-and-forget — don't block payment response)
    const user = await authPrisma.user.findUnique({ where: { id: req.user.id }, select: { email: true, name: true } });
    if (user?.email) {
      sendOrderReceiptEmail({
        to: user.email,
        userName: user.name,
        order: updated,
      }).catch((err) => console.error('📧 Receipt email error (non-blocking):', err.message));
    }

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

module.exports = { createPaymentOrder, verifyPayment };

