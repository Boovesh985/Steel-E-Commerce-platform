/**
 * Payment routes.
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/payment.controller');

const router = Router();
router.use(requireAuth);

router.post('/create-order', ctrl.createPaymentOrder);
router.post('/verify', ctrl.verifyPayment);

module.exports = router;
