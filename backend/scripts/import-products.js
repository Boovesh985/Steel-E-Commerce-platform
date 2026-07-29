/**
 * Product import script — imports REAL product data from the existing
 * inventory management project at E:\Inventory management.
 *
 * TRICHY WAREHOUSE ONLY — CBE/Coimbatore data is explicitly excluded.
 *
 * Data sources (all Trichy):
 *   - Stock Summary/June_AMK_*.xlsx  → latest closing stock (primary inventory source)
 *   - 25-26 TRY_SALES_STOCKSUMMARY/  → AMK+APL sales/purchases 25-26
 *   - 24-25 TRY_SALES_STOCKSUMMARY/  → APL sales 24-25
 *   - Purchase25-26.xlsx             → Trichy purchase register (for pricing)
 *
 * Usage: node scripts/import-products.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const XLSX = require('xlsx');
const { PrismaClient: CatalogPrismaClient } = require('../generated/catalog-client');
const { v4: uuidv4 } = require('uuid');

const catalogPrisma = new CatalogPrismaClient();

// ── Source directory ─────────────────────────────────────────────────────
const DATA_DIR = path.resolve('E:/Inventory management');
const STOCK_SUMMARY_DIR = path.join(DATA_DIR, 'Stock Summary');
const TRY_25_DIR = path.join(DATA_DIR, '25-26 TRY_SALES_STOCKSUMMARY');
const TRY_24_DIR = path.join(DATA_DIR, '24-25 TRY_SALES_STOCKSUMMARY');

// ── Excel file paths (TRICHY ONLY) ───────────────────────────────────────
const STOCK_FILES = [
  { file: path.join(STOCK_SUMMARY_DIR, 'June_AMK_Rectangle.xlsx'), shape: 'Rectangle' },
  { file: path.join(STOCK_SUMMARY_DIR, 'June_AMK_Round.xlsx'), shape: 'Round' },
  { file: path.join(STOCK_SUMMARY_DIR, 'June_AMK_Square.xlsx'), shape: 'Square' },
];

const SALES_25_FILES = [
  { file: path.join(TRY_25_DIR, '25 - 26 AMK Rectangle.xlsx'), shape: 'Rectangle', brand: 'AMK' },
  { file: path.join(TRY_25_DIR, '25 - 26 AMK Round_Square.xlsx'), shape: 'Round', brand: 'AMK', sheetName: 'AMK PIPE ROUND' },
  { file: path.join(TRY_25_DIR, '25 - 26 AMK Round_Square.xlsx'), shape: 'Square', brand: 'AMK', sheetName: 'AMK PIPE SQUARE' },
  { file: path.join(TRY_25_DIR, '25 - 26 APL.xlsx'), shape: 'Rectangle', brand: 'Apollo', sheetName: 'APL PIPE Rectangle' },
  { file: path.join(TRY_25_DIR, '25 - 26 APL.xlsx'), shape: 'Round', brand: 'Apollo', sheetName: 'APL PIPE Round' },
  { file: path.join(TRY_25_DIR, '25 - 26 APL.xlsx'), shape: 'Square', brand: 'Apollo', sheetName: 'APL PIPE Square' },
];

const SALES_24_FILES = [
  { file: path.join(TRY_24_DIR, '24 - 25 Sales APL Rectangle.xlsx'), shape: 'Rectangle', brand: 'Apollo' },
  { file: path.join(TRY_24_DIR, '24 - 25 Sales APL Round.xlsx'), shape: 'Round', brand: 'Apollo' },
  { file: path.join(TRY_24_DIR, '24 - 25 Sales APL Square.xlsx'), shape: 'Square', brand: 'Apollo' },
];

// ── Parsing Helpers ──────────────────────────────────────────────────────

function normalizeDims(raw) {
  if (!raw) return null;
  raw = String(raw).trim();
  // Pattern: NB or OD (round pipes)
  let m = raw.match(/(\d+)\s*(NB|OD)/i);
  if (m) return `${m[1]}${m[2].toUpperCase()}`;
  // Pattern: NxNxN
  m = raw.match(/(\d+)\s*[xX×]\s*(\d+)\s*[xX×]\s*([\d.]+)/);
  if (m) return `${m[1]}x${m[2]}x${m[3]}`;
  // Pattern: NxN
  m = raw.match(/(\d+)\s*[xX×*]\s*(\d+)/);
  if (m) return `${m[1]}x${m[2]}`;
  return null;
}

function extractThickness(raw) {
  const m = String(raw).match(/([\d.]+)\s*MM/i);
  return m ? parseFloat(m[1]) : null;
}

function extractWeight(raw) {
  const m = String(raw).match(/[=\s]([\d.]+)\s*[Kk][Gg]/);
  return m ? parseFloat(m[1]) : null;
}

function cleanName(raw) {
  let clean = String(raw).replace(/\s*\(.*?\)\s*/g, '');
  clean = clean.replace(/\s*=\s*[\d.]+\s*[Kk][Gg][Ss]?\s*$/g, '').trim();
  return clean;
}

function isPipeRow(name) {
  if (!name) return false;
  const upper = String(name).toUpperCase();
  return upper.includes('MS PIPE') || upper.includes('PIPE');
}

function isHeaderRow(name) {
  const HEADERS = ['APOLLO PIPE', 'AMK PIPE', 'MS PIPE', 'TOTAL', 'GRAND TOTAL',
    'RECTANGLE PIPE', 'ROUND PIPE', 'SQUARE PIPE', 'PARTICULARS'];
  const upper = String(name).toUpperCase().trim();
  return HEADERS.some((h) => upper === h || upper.startsWith(h + ' -'));
}

function makeSlug(name, brand, sku) {
  const base = `${brand || ''}-${name}`.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${sku.toLowerCase()}`;
}

function parseNum(val) {
  if (val == null) return 0;
  const m = String(val).match(/-?[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function parseInt2(val) {
  if (val == null) return 0;
  const m = String(val).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// ── Stock Summary Parser (June 2026 — latest closing balance) ────────────

function parseStockSummary() {
  const products = {}; // key -> product data
  const stock = {};    // key -> { qtyNos, qtyKgs, rate, value }

  for (const { file, shape } of STOCK_FILES) {
    let wb;
    try {
      wb = XLSX.readFile(file);
    } catch {
      console.log(`  [WARN] Stock file not found: ${path.basename(file)}`);
      continue;
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const totalCols = rows[0]?.length || 0;

    // Closing Balance is in last 4 columns
    const closingQtyCol = totalCols - 4;
    const closingNosCol = totalCols - 3;
    const closingRateCol = totalCols - 2;
    const closingValCol = totalCols - 1;

    const shapeCode = { Rectangle: 'REC', Round: 'RND', Square: 'SQR' }[shape];

    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      const name = String(row[0] || '').trim();
      if (!name || !isPipeRow(name) || isHeaderRow(name)) continue;
      if (name.toUpperCase().includes('TOTAL') || name.toUpperCase().includes('WAREHOUSE')) continue;

      const dims = normalizeDims(name);
      if (!dims) continue;

      const thickness = extractThickness(name);
      let effectiveDims = dims;
      if (thickness && (dims.includes('NB') || dims.includes('OD'))) {
        effectiveDims = `${dims}x${thickness}`;
      } else if (thickness && dims.split('x').length === 2) {
        effectiveDims = `${dims}x${thickness}`;
      }

      const key = `AMK|${effectiveDims}|${shape}`;

      const qtyKgs = parseNum(row[closingQtyCol]);
      const qtyNos = parseInt2(row[closingNosCol]);
      const rate = parseNum(row[closingRateCol]);
      const value = parseNum(row[closingValCol]);

      if (qtyNos <= 0 && qtyKgs <= 0) continue;

      // Register product
      if (!products[key]) {
        const weight = extractWeight(name);
        const parts = dims.replace('NB', '').replace('OD', '').split('x');
        const outerMm = parseFloat(parts[0]) || 50;
        const innerMm = parts.length >= 2 ? parseFloat(parts[1]) || outerMm : outerMm;

        products[key] = {
          name: cleanName(name),
          brand: 'AMK',
          shape,
          subcategory: `MS Pipes - ${shape}`,
          dims: effectiveDims,
          sku: `TRY-AMK-${shapeCode}-${Object.keys(products).length + 1}`.padEnd(15, '0').slice(0, 20),
          unit: 'nos',
          weightKg: weight,
          lengthM: 6.0,
          thicknessMm: thickness,
          widthMm: outerMm,
          heightMm: innerMm,
          pricePerKg: rate > 0 ? rate : 55,
          pricePerUnit: weight && rate > 0 ? Math.round(weight * rate * 100) / 100 : (rate > 0 ? rate : 55),
        };
      }

      // Accumulate stock
      if (!stock[key]) {
        stock[key] = { qtyNos: 0, qtyKgs: 0, rate: 0, value: 0 };
      }
      stock[key].qtyNos += Math.max(0, qtyNos);
      stock[key].qtyKgs += Math.max(0, qtyKgs);
      if (rate > 0) stock[key].rate = rate;
      stock[key].value += Math.max(0, value);
    }

    console.log(`  [STOCK] ${shape}: parsed ${path.basename(file)}`);
  }

  return { products, stock };
}

// ── Sales Files Parser (for additional products + pricing) ───────────────

function parseSalesFiles(fileList, products) {
  for (const { file, shape, brand, sheetName } of fileList) {
    let wb;
    try {
      wb = XLSX.readFile(file);
    } catch {
      console.log(`  [WARN] Sales file not found: ${path.basename(file)}`);
      continue;
    }

    const targetSheet = sheetName || wb.SheetNames[0];
    const ws = wb.Sheets[targetSheet];
    if (!ws) {
      console.log(`  [WARN] Sheet "${targetSheet}" not found in ${path.basename(file)}`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const totalCols = rows[0]?.length || 0;

    // Determine column layout
    const outwardOffset = 10; // cols 10-13 (0-indexed) for outwards
    const closingOffset = totalCols >= 22 ? 18 : 14;
    const brandCode = brand === 'Apollo' ? 'APL' : 'AMK';
    const shapeCode = { Rectangle: 'REC', Round: 'RND', Square: 'SQR' }[shape];

    let productCount = 0;

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const name = String(row[0] || '').trim();
      if (!name || !isPipeRow(name) || isHeaderRow(name)) continue;
      if (name.toUpperCase().includes('TOTAL') || name.toUpperCase().includes('WAREHOUSE')
        || name.toUpperCase().includes('KAJAPETTAI') || name.toUpperCase().includes('SANGILI')) continue;

      const dims = normalizeDims(name);
      if (!dims) continue;

      const thickness = extractThickness(name);
      let effectiveDims = dims;
      if (thickness && (dims.includes('NB') || dims.includes('OD'))) {
        effectiveDims = `${dims}x${thickness}`;
      } else if (thickness && dims.split('x').length === 2) {
        effectiveDims = `${dims}x${thickness}`;
      }

      const key = `${brandCode}|${effectiveDims}|${shape}`;

      if (!products[key]) {
        const weight = extractWeight(name);
        const parts = dims.replace('NB', '').replace('OD', '').split('x');
        const outerMm = parseFloat(parts[0]) || 50;
        const innerMm = parts.length >= 2 ? parseFloat(parts[1]) || outerMm : outerMm;

        // Try to get rate from closing balance columns
        let rate = parseNum(row[closingOffset + 2]);
        if (rate <= 0) rate = parseNum(row[outwardOffset + 2]);
        if (rate <= 0) rate = 55;

        products[key] = {
          name: cleanName(name),
          brand,
          shape,
          subcategory: `MS Pipes - ${shape}`,
          dims: effectiveDims,
          sku: `TRY-${brandCode}-${shapeCode}-${Object.keys(products).length + 1}`.padEnd(15, '0').slice(0, 22),
          unit: 'nos',
          weightKg: weight,
          lengthM: 6.0,
          thicknessMm: thickness,
          widthMm: outerMm,
          heightMm: innerMm,
          pricePerKg: rate,
          pricePerUnit: weight && rate > 0 ? Math.round(weight * rate * 100) / 100 : rate,
        };
        productCount++;
      } else {
        // Update price from latest data
        const rate = parseNum(row[closingOffset + 2]) || parseNum(row[outwardOffset + 2]);
        if (rate > 0) {
          products[key].pricePerKg = rate;
          if (products[key].weightKg) {
            products[key].pricePerUnit = Math.round(products[key].weightKg * rate * 100) / 100;
          } else {
            products[key].pricePerUnit = rate;
          }
        }
      }
    }

    console.log(`  [SALES] ${brand} ${shape}: +${productCount} new products from ${path.basename(file)}${sheetName ? ` [${sheetName}]` : ''}`);
  }
}

// ── Purchase Register Parser (for pricing) ───────────────────────────────

function parsePurchaseRegister(products) {
  const purchaseFile = path.join(DATA_DIR, 'Purchase25-26.xlsx');
  let wb;
  try {
    wb = XLSX.readFile(purchaseFile);
  } catch {
    console.log('  [WARN] Purchase file not found: Purchase25-26.xlsx');
    return;
  }

  let priceUpdates = 0;

  for (const sn of wb.SheetNames) {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const name = String(row[1] || '').trim(); // Col B has product name
      if (!isPipeRow(name)) continue;
      if (name.toUpperCase().includes('TOTAL') || name.toUpperCase().includes('GI PIPE')) continue;

      const dims = normalizeDims(name);
      if (!dims) continue;

      const thickness = extractThickness(name);
      const shape = detectShape(dims, name);
      const brandCode = name.toUpperCase().includes('AMK') || name.toUpperCase().includes('MEJ') ? 'AMK' : 'APL';

      let effectiveDims = dims;
      if (thickness && (dims.includes('NB') || dims.includes('OD'))) {
        effectiveDims = `${dims}x${thickness}`;
      } else if (thickness && dims.split('x').length === 2) {
        effectiveDims = `${dims}x${thickness}`;
      }

      const key = `${brandCode}|${effectiveDims}|${shape}`;

      // Update pricing from purchase rate (col 9, 0-indexed = col 8)
      const rate = parseNum(row[8]);
      if (rate > 0 && products[key]) {
        products[key].pricePerKg = rate;
        if (products[key].weightKg) {
          products[key].pricePerUnit = Math.round(products[key].weightKg * rate * 100) / 100;
        }
        priceUpdates++;
      }
    }
  }

  console.log(`  [PURCHASE] Updated pricing for ${priceUpdates} products`);
}

function detectShape(dims, name) {
  const upper = String(name).toUpperCase();
  if (upper.includes('SQ') && !upper.includes('RT')) return 'Square';
  if (upper.includes('NB') || upper.includes('OD') || upper.includes('RD')) return 'Round';
  if (dims) {
    const parts = dims.split('x');
    if (parts.length >= 2) {
      try {
        const d1 = parseFloat(parts[0]);
        const d2 = parseFloat(parts[1]);
        if (d1 === d2) return 'Square';
      } catch { /* ignore */ }
    }
    if (dims.includes('NB') || dims.includes('OD')) return 'Round';
  }
  return 'Rectangle';
}

// ── Main Import Function ─────────────────────────────────────────────────

async function importProducts() {
  console.log('\n🔧 AMK Steels Product Import — Trichy Warehouse Only');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Parse Stock Summary (primary source — June 2026 closing balance)
  console.log('📊 Step 1: Parsing Stock Summary (June 2026)...');
  const { products, stock } = parseStockSummary();
  console.log(`   → ${Object.keys(products).length} products with stock data\n`);

  // Step 2: Parse sales files for additional products + pricing
  console.log('📊 Step 2: Parsing Trichy sales files (24-25 + 25-26)...');
  parseSalesFiles(SALES_25_FILES, products);
  parseSalesFiles(SALES_24_FILES, products);
  console.log(`   → ${Object.keys(products).length} total products\n`);

  // Step 3: Parse purchase register for latest pricing
  console.log('📊 Step 3: Parsing Purchase Register (25-26)...');
  parsePurchaseRegister(products);
  console.log(`   → Pricing updated\n`);

  // Step 4: Create categories in DB
  console.log('📦 Step 4: Creating categories...');
  const parentCat = await catalogPrisma.category.upsert({
    where: { slug: 'pipes' },
    create: { name: 'Pipes', slug: 'pipes' },
    update: {},
  });

  const subcategories = {};
  for (const shape of ['Rectangle', 'Round', 'Square']) {
    const slug = `ms-pipes-${shape.toLowerCase()}`;
    const cat = await catalogPrisma.category.upsert({
      where: { slug },
      create: { name: `MS Pipes - ${shape}`, slug, parentId: parentCat.id },
      update: {},
    });
    subcategories[shape] = cat;
  }
  console.log('   ✅ Categories: Pipes → MS Pipes - Rectangle/Round/Square\n');

  // Step 5: Create Trichy Warehouse
  console.log('🏭 Step 5: Creating Kajapettai Warehouse (Trichy)...');
  let warehouse = await catalogPrisma.warehouse.findFirst({ where: { city: 'Trichy' } });
  if (!warehouse) {
    warehouse = await catalogPrisma.warehouse.create({
      data: {
        name: 'Kajapettai Warehouse',
        city: 'Trichy',
        state: 'Tamil Nadu',
        pincode: '620001',
        phone: null,
      },
    });
  }
  console.log(`   ✅ Warehouse: ${warehouse.name} (${warehouse.city})\n`);

  // Step 6: Upsert products + inventory
  console.log('📦 Step 6: Importing products and inventory...');
  let created = 0;
  let updated = 0;
  let inventoryCreated = 0;
  const skuSet = new Set();

  for (const [key, pData] of Object.entries(products)) {
    // Ensure unique SKU
    let sku = pData.sku;
    let counter = 1;
    while (skuSet.has(sku)) {
      sku = `${pData.sku}-${counter}`;
      counter++;
    }
    skuSet.add(sku);

    const categoryId = subcategories[pData.shape]?.id;
    if (!categoryId) continue;

    const slug = makeSlug(pData.name, pData.brand, sku);

    const specifications = {
      dimensions: pData.dims,
      subcategory: pData.subcategory,
      weightKg: pData.weightKg,
      lengthM: pData.lengthM,
      thicknessMm: pData.thicknessMm,
      widthMm: pData.widthMm,
      heightMm: pData.heightMm,
      pricePerKg: pData.pricePerKg,
    };

    // Remove null values from specifications
    Object.keys(specifications).forEach((k) => {
      if (specifications[k] == null) delete specifications[k];
    });

    try {
      const product = await catalogPrisma.product.upsert({
        where: { sku },
        create: {
          categoryId,
          name: pData.name,
          slug,
          brand: pData.brand,
          sku,
          hsnCode: '7306',
          gstRate: 18,
          description: `${pData.brand} MS Pipe ${pData.dims} - ${pData.shape}`,
          baseUnit: pData.unit,
          pricePerUnit: pData.pricePerUnit || 55,
          minOrderQty: 1,
          specifications,
          isActive: true,
        },
        update: {
          pricePerUnit: pData.pricePerUnit || 55,
          specifications,
        },
      });

      // Create inventory from stock summary
      const stockData = stock[key];
      const qtyAvailable = stockData ? Math.max(0, stockData.qtyNos) : 0;

      // If qtyNos is 0 but qtyKgs > 0, calculate from weight
      let qty = qtyAvailable;
      if (qty === 0 && stockData?.qtyKgs > 0 && pData.weightKg) {
        qty = Math.max(0, Math.floor(stockData.qtyKgs / pData.weightKg));
      }

      await catalogPrisma.inventory.upsert({
        where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
        create: {
          productId: product.id,
          warehouseId: warehouse.id,
          quantityAvailable: qty,
          quantityReserved: 0,
          reorderLevel: qty > 0 ? Math.max(5, Math.floor(qty * 0.15)) : 10,
        },
        update: {
          quantityAvailable: qty,
          reorderLevel: qty > 0 ? Math.max(5, Math.floor(qty * 0.15)) : 10,
        },
      });

      // Add price history entry
      if (pData.pricePerUnit > 0) {
        await catalogPrisma.priceHistory.create({
          data: { productId: product.id, price: pData.pricePerUnit },
        });
      }

      if (stockData) created++;
      else updated++;
      inventoryCreated++;
    } catch (err) {
      console.error(`  [ERROR] ${sku}: ${err.message}`);
    }
  }

  console.log(`   ✅ ${created} products with stock, ${updated} products without stock`);
  console.log(`   ✅ ${inventoryCreated} inventory records created\n`);

  // Step 7: Verification
  console.log('🔍 Step 7: Verification...');
  const totalProducts = await catalogPrisma.product.count();
  const totalInventory = await catalogPrisma.inventory.count();
  const warehouses = await catalogPrisma.warehouse.findMany();
  const categories = await catalogPrisma.category.findMany();

  // Check for CBE contamination
  const cbeProducts = await catalogPrisma.product.count({
    where: {
      OR: [
        { name: { contains: 'CBE', mode: 'insensitive' } },
        { name: { contains: 'Coimbatore', mode: 'insensitive' } },
        { name: { contains: 'Saravanampatti', mode: 'insensitive' } },
        { name: { contains: 'Saibaba', mode: 'insensitive' } },
      ],
    },
  });

  const cbeWarehouses = await catalogPrisma.warehouse.count({
    where: {
      OR: [
        { name: { contains: 'CBE', mode: 'insensitive' } },
        { name: { contains: 'Coimbatore', mode: 'insensitive' } },
        { city: { contains: 'Coimbatore', mode: 'insensitive' } },
      ],
    },
  });

  console.log(`   Products:    ${totalProducts}`);
  console.log(`   Inventory:   ${totalInventory} records`);
  console.log(`   Warehouses:  ${warehouses.length} (${warehouses.map((w) => `${w.name} [${w.city}]`).join(', ')})`);
  console.log(`   Categories:  ${categories.length}`);
  console.log(`   CBE products: ${cbeProducts} ${cbeProducts === 0 ? '✅' : '❌ CONTAMINATION DETECTED!'}`);
  console.log(`   CBE warehouses: ${cbeWarehouses} ${cbeWarehouses === 0 ? '✅' : '❌ CONTAMINATION DETECTED!'}`);

  if (cbeProducts > 0 || cbeWarehouses > 0) {
    console.error('\n❌ CBE/Coimbatore data detected in catalog! This is a data integrity violation.');
    process.exit(1);
  }

  console.log('\n✅ Import complete! Trichy-only data verified.\n');
}

importProducts()
  .catch((err) => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  })
  .finally(() => catalogPrisma.$disconnect());
