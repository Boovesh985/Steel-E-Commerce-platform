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

/**
 * Cleanup expired refresh tokens to prevent unbounded table growth.
 * Runs on startup (after a short delay) and then every 24 hours.
 */
async function cleanupExpiredTokens() {
  try {
    const result = await authPrisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} expired refresh token(s).`);
    }
  } catch (err) {
    console.error('⚠️ Failed to cleanup expired tokens:', err.message);
  }
}

// Run cleanup after startup (10s delay to let DB connections establish)
setTimeout(cleanupExpiredTokens, 10_000);
// Then run every 24 hours
setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

module.exports = { authPrisma, catalogPrisma, disconnectAll };

