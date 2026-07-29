/**
 * Zod schemas for cart-related requests.
 */
const { z } = require('zod');

const addCartItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

module.exports = { addCartItemSchema, updateCartItemSchema };
