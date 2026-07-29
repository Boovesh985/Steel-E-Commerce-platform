/**
 * Order routes.
 */
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { createOrderSchema } = require('../schemas/order.schema');
const ctrl = require('../controllers/order.controller');

const router = Router();

router.use(requireAuth);

router.post('/', validate(createOrderSchema), ctrl.createOrder);
router.get('/', ctrl.listOrders);
router.get('/:id', ctrl.getOrder);
router.get('/:id/tracking', ctrl.getTracking);
router.put('/:id/cancel', ctrl.cancelOrder);

module.exports = router;
