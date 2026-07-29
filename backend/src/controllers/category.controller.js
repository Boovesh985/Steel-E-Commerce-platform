/**
 * Category controller.
 */
const { catalogPrisma } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// GET /api/categories — returns full category tree
async function listCategories(req, res, next) {
  try {
    const categories = await catalogPrisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { children: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
}

module.exports = { listCategories };
