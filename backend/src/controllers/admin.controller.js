/**
 * Admin controller — product CRUD, category, orders, inventory, users, dashboard.
 */
const { authPrisma, catalogPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { createProductSchema } = require('../schemas/product.schema');

// ── Valid order status transitions ──────────────────────────────────────
const VALID_STATUS_TRANSITIONS = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PROCESSING', 'CANCELLED'],
  PROCESSING:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        ['RETURNED'],
  CANCELLED:        [],
  RETURNED:         [],
};

// ── Product CRUD ────────────────────────────────────────────────────────

// POST /api/admin/products
async function createProduct(req, res, next) {
  try {
    const data = req.body;
    // Generate slug from name
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    // Check slug uniqueness
    const existing = await catalogPrisma.product.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    const product = await catalogPrisma.product.create({
      data: { ...data, slug: finalSlug, specifications: data.specifications || {} },
      include: { category: true, images: true },
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
}

// PUT /api/admin/products/:id
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;

    const product = await catalogPrisma.product.update({
      where: { id },
      data,
      include: { category: true, images: true },
    });

    // Add price history if price changed
    if (data.pricePerUnit !== undefined) {
      await catalogPrisma.priceHistory.create({
        data: { productId: id, price: data.pricePerUnit },
      });
    }

    res.json({ success: true, data: product });
  } catch (err) { next(err); }
}

// DELETE /api/admin/products/:id (soft delete)
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await catalogPrisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true, data: { message: 'Product deactivated.', product } });
  } catch (err) { next(err); }
}

// POST /api/admin/products/import — bulk import from JSON
async function importProducts(req, res, next) {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      throw new AppError(400, 'VALIDATION_ERROR', 'products array is required.');
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const p of products) {
      try {
        // Validate each product against the schema before upserting
        const validated = createProductSchema.parse(p);
        const slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        await catalogPrisma.product.upsert({
          where: { sku: validated.sku },
          create: { ...validated, slug: `${slug}-${Date.now().toString(36)}`, specifications: validated.specifications || {} },
          update: { ...validated, specifications: validated.specifications || {} },
        });
        results.created++;
      } catch (err) {
        results.errors.push({ sku: p.sku || 'unknown', error: err.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (err) { next(err); }
}

// ── Categories ──────────────────────────────────────────────────────────

// POST /api/admin/categories
async function createCategory(req, res, next) {
  try {
    const { name, slug, parentId, imageUrl } = req.body;
    const category = await catalogPrisma.category.create({
      data: { name, slug, parentId, imageUrl },
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) { next(err); }
}

// ── Orders ──────────────────────────────────────────────────────────────

// GET /api/admin/orders
async function listAllOrders(req, res, next) {
  try {
    const { page = '1', limit = '20', status, from, to } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = {};
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      authPrisma.order.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
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

// PUT /api/admin/orders/:id/status — update status → auto-create tracking event
async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note, location } = req.body;

    const order = await authPrisma.order.findUnique({ where: { id } });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.');

    // Validate status transition — prevent invalid jumps (e.g. PENDING → DELIVERED)
    const currentStatus = order.status;
    const allowedNext = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(status)) {
      throw new AppError(400, 'INVALID_STATUS_TRANSITION',
        `Cannot change order status from ${currentStatus} to ${status}. Allowed transitions: ${allowedNext.join(', ') || 'none (terminal state)'}.`);
    }

    // Auto-sync paymentStatus based on order status transitions
    const updateData = {
      status,
      trackingEvents: {
        create: { status, note, location },
      },
    };

    // If shipping/delivering, payment must be received
    if (['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status) && order.paymentStatus !== 'PAID') {
      updateData.paymentStatus = 'PAID';
    }
    // If cancelling a paid order, mark as refunded
    if (status === 'CANCELLED' && order.paymentStatus === 'PAID') {
      updateData.paymentStatus = 'REFUNDED';
    }

    const updated = await authPrisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        trackingEvents: { orderBy: { timestamp: 'asc' } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// ── Inventory ───────────────────────────────────────────────────────────

// GET /api/admin/inventory
async function listInventory(req, res, next) {
  try {
    const { page = '1', limit = '50', lowStock, warehouseId } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    if (lowStock === 'true') {
      // Use raw SQL to compare quantityAvailable <= reorderLevel (per-row threshold)
      // Prisma's where clause can't compare two columns directly
      // Using $queryRaw tagged template — values are auto-parameterized (safe from injection)
      const warehouseFilter = warehouseId
        ? catalogPrisma.$queryRaw`SELECT i.id FROM "Inventory" i WHERE i."quantityAvailable" <= i."reorderLevel" AND i."warehouseId" = ${warehouseId}`
        : catalogPrisma.$queryRaw`SELECT i.id FROM "Inventory" i WHERE i."quantityAvailable" <= i."reorderLevel"`;

      const lowStockIds = (await warehouseFilter).map((r) => r.id);
      const total = lowStockIds.length;

      // Paginate within the filtered IDs
      const paginatedIds = lowStockIds.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      const inventory = paginatedIds.length > 0
        ? await catalogPrisma.inventory.findMany({
            where: { id: { in: paginatedIds } },
            include: {
              product: { select: { id: true, name: true, sku: true, brand: true, baseUnit: true } },
              warehouse: { select: { id: true, name: true, city: true } },
            },
            orderBy: { updatedAt: 'desc' },
          })
        : [];

      return res.json({
        success: true,
        data: inventory,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    }

    // Standard (non-lowStock) path
    const where = {};
    if (warehouseId) where.warehouseId = warehouseId;

    const [inventory, total] = await Promise.all([
      catalogPrisma.inventory.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true, brand: true, baseUnit: true } },
          warehouse: { select: { id: true, name: true, city: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      catalogPrisma.inventory.count({ where }),
    ]);

    res.json({
      success: true,
      data: inventory,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
}

// PUT /api/admin/inventory/:productId
async function updateInventory(req, res, next) {
  try {
    const { productId } = req.params;
    const { quantityAvailable, quantityReserved, reorderLevel } = req.body;

    // Find inventory for this product (first warehouse if multiple)
    const inv = await catalogPrisma.inventory.findFirst({ where: { productId } });
    if (!inv) throw new AppError(404, 'NOT_FOUND', 'Inventory record not found.');

    const updated = await catalogPrisma.inventory.update({
      where: { id: inv.id },
      data: {
        ...(quantityAvailable !== undefined && { quantityAvailable }),
        ...(quantityReserved !== undefined && { quantityReserved }),
        ...(reorderLevel !== undefined && { reorderLevel }),
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

// ── Users ───────────────────────────────────────────────────────────────

// GET /api/admin/users
async function listUsers(req, res, next) {
  try {
    const { page = '1', limit = '20', role, q } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const where = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      authPrisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          gstin: true, isActive: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      authPrisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
}

// PUT /api/admin/users/:id/role
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      throw new AppError(400, 'SELF_ROLE_CHANGE', 'You cannot change your own role. Ask another admin to do this.');
    }

    // If demoting an admin, ensure at least one admin remains
    const targetUser = await authPrisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!targetUser) throw new AppError(404, 'NOT_FOUND', 'User not found.');

    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await authPrisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        throw new AppError(400, 'LAST_ADMIN', 'Cannot demote the last admin. Promote another user to admin first.');
      }
    }

    const user = await authPrisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

// ── Dashboard ───────────────────────────────────────────────────────────

// GET /api/admin/dashboard
async function getDashboard(req, res, next) {
  try {
    // Parallel queries for speed
    const [
      totalOrders,
      ordersByStatus,
      totalUsers,
      totalProducts,
      recentOrders,
      lowStockItems,
      revenueResult,
    ] = await Promise.all([
      authPrisma.order.count(),
      authPrisma.order.groupBy({ by: ['status'], _count: true }),
      authPrisma.user.count(),
      catalogPrisma.product.count({ where: { isActive: true } }),
      authPrisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { productName: true, quantity: true } },
        },
      }),
      catalogPrisma.inventory.findMany({
        where: { quantityAvailable: { lte: 10 } },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
        },
        take: 20,
      }),
      authPrisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        totalUsers,
        totalProducts,
        totalRevenue: revenueResult._sum.totalAmount || 0,
        recentOrders,
        lowStockItems: lowStockItems.map((inv) => ({
          id: inv.id,
          productId: inv.productId,
          name: inv.product?.name,
          sku: inv.product?.sku,
          quantityAvailable: inv.quantityAvailable,
          warehouseName: inv.warehouse?.name,
        })),
      },
    });
  } catch (err) { next(err); }
}

module.exports = {
  createProduct, updateProduct, deleteProduct, importProducts,
  createCategory,
  listAllOrders, updateOrderStatus,
  listInventory, updateInventory,
  listUsers, updateUserRole,
  getDashboard,
};
