/**
 * Payment service — Razorpay integration.
 */
const Razorpay = require('razorpay');
const crypto = require('crypto');
const env = require('../config/env');

const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order.
 * @param {number} amountInPaise — total in paise (₹1 = 100 paise)
 * @param {string} receipt — unique receipt ID (e.g. order number)
 */
async function createRazorpayOrder(amountInPaise, receipt) {
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    notes: { company: 'AMK Steels' },
  });
  return order;
}

/**
 * Verify Razorpay payment signature.
 */
function verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature) {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

/**
 * Initiate a full refund for a Razorpay payment.
 * @param {string} paymentId — Razorpay payment ID (pay_xxx)
 * @param {number} amountInPaise — amount to refund in paise
 * @param {string} notes — reason for refund
 */
async function createRefund(paymentId, amountInPaise, notes) {
  const refund = await razorpay.payments.refund(paymentId, {
    amount: amountInPaise,
    speed: 'normal', // 'normal' (5-7 days) or 'optimum' (instant if eligible)
    notes: { reason: notes || 'Order cancelled by customer' },
  });
  return refund;
}

module.exports = { createRazorpayOrder, verifyPaymentSignature, createRefund, razorpay };
