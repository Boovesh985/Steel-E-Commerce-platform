/**
 * Cart routes.
 */
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { addCartItemSchema, updateCartItemSchema } = require('../schemas/cart.schema');
const ctrl = require('../controllers/cart.controller');

const router = Router();

router.use(requireAuth);

router.get('/', ctrl.getCart);
router.post('/items', validate(addCartItemSchema), ctrl.addItem);
router.put('/items/:itemId', validate(updateCartItemSchema), ctrl.updateItem);
router.delete('/items/:itemId', ctrl.removeItem);
router.delete('/', ctrl.clearCart);

module.exports = router;
