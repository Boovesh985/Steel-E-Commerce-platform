/**
 * Wishlist controller.
 */
const { authPrisma, catalogPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/wishlist
async function listWishlist(req, res, next) {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    const where = { userId: req.user.id };

    const [items, total] = await Promise.all([
      authPrisma.wishlistItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      authPrisma.wishlistItem.count({ where }),
    ]);

    // Batch-fetch product data from catalog for all wishlist items at once
    const productIds = items.map((item) => item.productId);
    const products = productIds.length > 0
      ? await catalogPrisma.product.findMany({
          where: { id: { in: productIds } },
          include: {
            images: { orderBy: { displayOrder: 'asc' }, take: 1 },
            inventory: { select: { quantityAvailable: true } },
          },
        })
      : [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    const enriched = items.map((item) => {
      const product = productMap.get(item.productId);
      return {
        ...item,
        product: product ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          pricePerUnit: product.pricePerUnit,
          discountPrice: product.discountPrice,
          baseUnit: product.baseUnit,
          image: product.images?.[0]?.url || null,
          totalStock: product.inventory.reduce((s, i) => s + i.quantityAvailable, 0),
          inStock: product.inventory.some((i) => i.quantityAvailable > 0),
        } : null,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
}

// POST /api/wishlist
async function addToWishlist(req, res, next) {
  try {
    const { productId } = req.body;
    if (!productId) throw new AppError(400, 'VALIDATION_ERROR', 'productId is required.');

    // Verify product exists
    const product = await catalogPrisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found.');

    const item = await authPrisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      create: { userId: req.user.id, productId },
      update: {},
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) { next(err); }
}

// DELETE /api/wishlist/:productId
async function removeFromWishlist(req, res, next) {
  try {
    const { productId } = req.params;

    await authPrisma.wishlistItem.deleteMany({
      where: { userId: req.user.id, productId },
    });

    res.json({ success: true, data: { message: 'Removed from wishlist.' } });
  } catch (err) { next(err); }
}

module.exports = { listWishlist, addToWishlist, removeFromWishlist };
