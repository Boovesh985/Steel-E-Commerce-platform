/**
 * Database client initialization — two separate Prisma clients for isolated databases.
 *
 * amk_auth:    users, orders, cart, tracking, reviews, wishlist
 * amk_catalog: products, categories, inventory, warehouses
 */
const { PrismaClient: AuthPrismaClient } = require('../../generated/auth-client');
const { PrismaClient: CatalogPrismaClient } = require('../../generated/catalog-client');

const authPrisma = new AuthPrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const catalogPrisma = new CatalogPrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Graceful shutdown
async function disconnectAll() {
  await authPrisma.$disconnect();
  await catalogPrisma.$disconnect();
}

process.on('beforeExit', disconnectAll);

module.exports = { authPrisma, catalogPrisma, disconnectAll };
