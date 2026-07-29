/**
 * Zod schemas for product-related requests.
 */
const { z } = require('zod');

const createProductSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(2).max(255),
  brand: z.string().max(100).optional().nullable(),
  sku: z.string().min(1).max(100),
  hsnCode: z.string().max(20).optional().nullable(),
  gstRate: z.number().min(0).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  baseUnit: z.string().min(1).max(50),
  pricePerUnit: z.number().positive('Price must be positive'),
  discountPrice: z.number().positive().optional().nullable(),
  minOrderQty: z.number().int().min(1).optional(),
  specifications: z.record(z.any()).optional(),
});

const updateProductSchema = createProductSchema.partial();

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  parentId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
  comment: z.string().max(1000).optional().nullable(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  createCategorySchema,
  reviewSchema,
};
