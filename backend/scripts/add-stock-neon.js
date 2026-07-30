/**
 * Add default stock to all products that have 0 stock on Neon.
 */
require('dotenv').config();

const { PrismaClient } = require('../generated/catalog-client');

const db = new PrismaClient({
  datasources: {
    db: { url: process.env.CATALOG_DATABASE_URL },
  },
});

async function main() {
  const zeroStock = await db.inventory.findMany({
    where: { quantityAvailable: { lte: 0 } },
  });

  console.log(`Found ${zeroStock.length} products with 0 stock. Adding default stock...`);

  let updated = 0;
  for (const inv of zeroStock) {
    const defaultQty = Math.floor(Math.random() * 41) + 10; // 10-50
    await db.inventory.update({
      where: { id: inv.id },
      data: { quantityAvailable: defaultQty },
    });
    updated++;
  }

  console.log(`✅ Updated ${updated} inventory records.`);

  const inStock = await db.inventory.count({ where: { quantityAvailable: { gt: 0 } } });
  const total = await db.inventory.count();
  console.log(`📊 Final: ${inStock}/${total} products now in stock.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
