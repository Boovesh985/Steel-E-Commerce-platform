/**
 * Admin routes — all require requireAuth + requireAdmin.
 */
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { createProductSchema, updateProductSchema, createCategorySchema } = require('../schemas/product.schema');
const { updateOrderStatusSchema, updateInventorySchema, updateUserRoleSchema } = require('../schemas/order.schema');
const ctrl = require('../controllers/admin.controller');

const router = Router();
router.use(requireAuth, requireAdmin);

// Products
router.post('/products', validate(createProductSchema), ctrl.createProduct);
router.put('/products/:id', validate(updateProductSchema), ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);
router.post('/products/import', ctrl.importProducts);

// Categories
router.post('/categories', validate(createCategorySchema), ctrl.createCategory);

// Orders
router.get('/orders', ctrl.listAllOrders);
router.put('/orders/:id/status', validate(updateOrderStatusSchema), ctrl.updateOrderStatus);

// Inventory
router.get('/inventory', ctrl.listInventory);
router.put('/inventory/:productId', validate(updateInventorySchema), ctrl.updateInventory);

// Users
router.get('/users', ctrl.listUsers);
router.put('/users/:id/role', validate(updateUserRoleSchema), ctrl.updateUserRole);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

module.exports = router;
