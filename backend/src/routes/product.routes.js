/**
 * Product routes.
 */
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { reviewSchema } = require('../schemas/product.schema');
const ctrl = require('../controllers/product.controller');

const router = Router();

router.get('/', ctrl.listProducts);
router.get('/:id', ctrl.getProduct);
router.get('/:id/reviews', ctrl.listReviews);
router.post('/:id/reviews', requireAuth, validate(reviewSchema), ctrl.createReview);

module.exports = router;
