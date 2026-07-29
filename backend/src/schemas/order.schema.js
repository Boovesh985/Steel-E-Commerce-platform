/**
 * Zod schemas for order-related requests.
 */
const { z } = require('zod');

const createOrderSchema = z.object({
  addressId: z.string().uuid('Invalid address ID'),
  buyerGstin: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED',
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED',
  ]),
  note: z.string().max(500).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
});

const updateInventorySchema = z.object({
  quantityAvailable: z.number().int().min(0).optional(),
  quantityReserved: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'ADMIN', 'STAFF']),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  updateInventorySchema,
  updateUserRoleSchema,
};
