/**
 * Wishlist routes.
 */
const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/wishlist.controller');

const router = Router();
router.use(requireAuth);

router.get('/', ctrl.listWishlist);
router.post('/', ctrl.addToWishlist);
router.delete('/:productId', ctrl.removeFromWishlist);

module.exports = router;
