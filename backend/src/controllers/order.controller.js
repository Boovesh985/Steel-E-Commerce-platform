/**
 * Order controller — create, list, detail, tracking, cancel.
 */
const { authPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { checkout, restoreStockForOrder } = require('../services/checkout.service');
const { createRefund } = require('../services/payment.service');

// Cancellable statuses — once processing starts, customer cannot cancel
const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

// POST /api/orders — checkout
async function createOrder(req, res, next) {
  try {
    const { addressId, buyerGstin, notes } = req.body;
    const order = await checkout(req.user.id, addressId, buyerGstin, notes);
    res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
}

// GET /api/orders — list own orders
async function listOrders(req, res, next) {
  try {
    const { page = '1', limit = '10', status } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      authPrisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      authPrisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
}

// GET /api/orders/:id — order detail
async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const order = await authPrisma.order.findUnique({
      where: { id },
      include: { items: true, trackingEvents: { orderBy: { timestamp: 'asc' } } },
    });

    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    // Verify ownership (unless admin — handled by admin routes)
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this order.');
    }

    res.json({ success: true, data: order });
  } catch (err) { next(err); }
}

// GET /api/orders/:id/tracking
async function getTracking(req, res, next) {
  try {
    const { id } = req.params;

    // Verify order belongs to user
    const order = await authPrisma.order.findUnique({
      where: { id },
      select: { id: true, userId: true, orderNumber: true, status: true },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this order.');
    }

    const events = await authPrisma.trackingEvent.findMany({
      where: { orderId: id },
      orderBy: { timestamp: 'asc' },
    });

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        events,
      },
    });
  } catch (err) { next(err); }
}

// PUT /api/orders/:id/cancel
async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const order = await authPrisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.');
    if (order.userId !== req.user.id) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this order.');
    }

    const upperStatus = order.status?.toUpperCase();
    if (!CANCELLABLE_STATUSES.includes(upperStatus)) {
      throw new AppError(400, 'INVALID_STATUS',
        `Order cannot be cancelled — it has already been ${upperStatus.toLowerCase()}. Only orders that are pending or confirmed can be cancelled.`);
    }

    // ── Restore stock in catalog ──────────────────────────────────────
    await restoreStockForOrder(id);

    // ── Handle refund if payment was made ──────────────────────────────
    let refundId = null;
    let newPaymentStatus = order.paymentStatus;
    const cancelNote = reason || 'Cancelled by customer';

    if (order.paymentStatus === 'PAID' && order.paymentId) {
      try {
        // Calculate refund amount in paise
        const totalAmountNum = parseFloat(order.totalAmount.toString());
        const amountInPaise = Math.round(totalAmountNum * 100);

        const refund = await createRefund(order.paymentId, amountInPaise, cancelNote);
        refundId = refund.id;
        newPaymentStatus = 'REFUNDED';
      } catch (refundErr) {
        // Log refund failure but still cancel the order — admin can manually refund
        console.error(`⚠️ Refund failed for order ${order.orderNumber}:`, refundErr.message);
        // Don't change payment status — admin will need to handle it manually
      }
    } else if (order.paymentStatus === 'PENDING') {
      // No payment was made — nothing to refund
      newPaymentStatus = 'PENDING';
    }

    // ── Update order status ───────────────────────────────────────────
    const trackingNote = refundId
      ? `${cancelNote}. Refund initiated (ID: ${refundId}) — amount will be credited in 5–7 business days.`
      : order.paymentStatus === 'PAID'
        ? `${cancelNote}. Refund will be processed manually by the admin team.`
        : `${cancelNote}.`;

    const updated = await authPrisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        paymentStatus: newPaymentStatus,
        trackingEvents: {
          create: { status: 'CANCELLED', note: trackingNote },
        },
      },
      include: { items: true, trackingEvents: { orderBy: { timestamp: 'asc' } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

module.exports = { createOrder, listOrders, getOrder, getTracking, cancelOrder };
