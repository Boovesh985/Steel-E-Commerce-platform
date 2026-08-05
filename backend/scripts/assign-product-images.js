/**
 * Assign product images to all products based on their shape/subcategory.
 *
 * Products have subcategory names like "MS Pipes - Round", "MS Pipes - Square",
 * "MS Pipes - Rectangle". This script maps each to the corresponding static image
 * hosted on the Vercel frontend.
 *
 * Usage: node scripts/assign-product-images.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient: CatalogPrismaClient } = require('../generated/catalog-client');
const catalogPrisma = new CatalogPrismaClient();

// ── Image URLs (hosted as static assets on Vercel frontend) ──
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://amk-steels.vercel.app';

const SHAPE_IMAGE_MAP = {
  round: `${FRONTEND_URL}/images/products/ms-pipe-round.png`,
  square: `${FRONTEND_URL}/images/products/ms-pipe-square.png`,
  rectangle: `${FRONTEND_URL}/images/products/ms-pipe-rectangle.png`,
};

// Detect shape from product name, brand, sku, or subcategory
function detectShape(product, categoryName) {
  const haystack = `${product.name} ${categoryName || ''} ${product.sku || ''}`.toLowerCase();
  if (haystack.includes('rectangle') || haystack.includes('rec')) return 'rectangle';
  if (haystack.includes('square') || haystack.includes('sqr')) return 'square';
  if (haystack.includes('round') || haystack.includes('rnd') || haystack.includes('nb') || haystack.includes('od')) return 'round';
  // Default: look at specs
  const specs = product.specifications || {};
  if (specs.shape) return specs.shape.toLowerCase();
  return null;
}

async function main() {
  console.log('🔧 Assigning product images...\n');

  // Fetch all products with their categories and existing images
  const products = await catalogPrisma.product.findMany({
    include: { category: true, images: true },
  });

  console.log(`Found ${products.length} products\n`);

  let assigned = 0;
  let skipped = 0;
  let noShape = 0;

  for (const product of products) {
    // Skip if product already has images
    if (product.images.length > 0) {
      skipped++;
      continue;
    }

    const shape = detectShape(product, product.category?.name);
    if (!shape || !SHAPE_IMAGE_MAP[shape]) {
      console.log(`  ⚠ No shape detected for: ${product.name} (${product.sku})`);
      noShape++;
      continue;
    }

    const imageUrl = SHAPE_IMAGE_MAP[shape];

    await catalogPrisma.productImage.create({
      data: {
        productId: product.id,
        url: imageUrl,
        displayOrder: 0,
      },
    });

    assigned++;
  }

  console.log(`\n✅ Done!`);
  console.log(`   Assigned images: ${assigned}`);
  console.log(`   Already had images: ${skipped}`);
  console.log(`   No shape detected: ${noShape}`);

  await catalogPrisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
