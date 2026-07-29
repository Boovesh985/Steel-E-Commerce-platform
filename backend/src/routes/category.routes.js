/**
 * Category routes.
 */
const { Router } = require('express');
const ctrl = require('../controllers/category.controller');

const router = Router();

router.get('/', ctrl.listCategories);

module.exports = router;
