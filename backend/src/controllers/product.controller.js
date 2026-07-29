/**
 * Product controller — list/search/filter, detail, reviews.
 */
const { catalogPrisma, authPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/products — list with search/filter/pagination
async function listProducts(req, res, next) {
  try {
    const {
      category, q, minPrice, maxPrice, brand, sort,
      page = '1', limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { isActive: true };

    if (category) {
      // Find category by slug
      const cat = await catalogPrisma.category.findUnique({ where: { slug: category } });
      if (cat) {
        // Include subcategories
        const childCats = await catalogPrisma.category.findMany({ where: { parentId: cat.id } });
        const catIds = [cat.id, ...childCats.map((c) => c.id)];
        where.categoryId = { in: catIds };
      }
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.pricePerUnit = {};
      if (minPrice) where.pricePerUnit.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerUnit.lte = parseFloat(maxPrice);
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    // Build orderBy
    let orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { pricePerUnit: 'asc' };
    else if (sort === 'price_desc') orderBy = { pricePerUnit: 'desc' };
    else if (sort === 'name_asc') orderBy = { name: 'asc' };
    else if (sort === 'name_desc') orderBy = { name: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      catalogPrisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { displayOrder: 'asc' }, take: 3 },
          inventory: { select: { quantityAvailable: true } },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      catalogPrisma.product.count({ where }),
    ]);

    // Attach total stock to each product
    const enriched = products.map((p) => {
      const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
      const { inventory, ...rest } = p;
      return { ...rest, totalStock, inStock: totalStock > 0 };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) { next(err); }
}

// GET /api/products/:id — product detail
async function getProduct(req, res, next) {
  try {
    const { id } = req.params;

    // Support lookup by UUID or slug (frontend routes use /products/:slug)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const whereClause = isUUID ? { id } : { slug: id };

    const product = await catalogPrisma.product.findUnique({
      where: whereClause,
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        inventory: {
          include: { warehouse: { select: { id: true, name: true, city: true } } },
        },
        priceHistory: { orderBy: { effectiveFrom: 'desc' }, take: 10 },
      },
    });

    if (!product || !product.isActive) {
      throw new AppError(404, 'NOT_FOUND', 'Product not found.');
    }

    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);

    // Fetch reviews from auth DB (cross-database) — always use product.id
    const reviews = await authPrisma.review.findMany({
      where: { productId: product.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        ...product,
        totalStock,
        inStock: totalStock > 0,
        reviews,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
      },
    });
  } catch (err) { next(err); }
}

// GET /api/products/:id/reviews
async function listReviews(req, res, next) {
  try {
    const { id } = req.params;
    const reviews = await authPrisma.review.findMany({
      where: { productId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
}

// POST /api/products/:id/reviews
async function createReview(req, res, next) {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Verify product exists in catalog
    const product = await catalogPrisma.product.findUnique({ where: { id } });
    if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found.');

    // Check if user already reviewed this product
    const existing = await authPrisma.review.findUnique({
      where: { userId_productId: { userId: req.user.id, productId: id } },
    });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_ENTRY', 'You have already reviewed this product.');
    }

    const review = await authPrisma.review.create({
      data: { userId: req.user.id, productId: id, rating, comment },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
}

module.exports = { listProducts, getProduct, listReviews, createReview };
