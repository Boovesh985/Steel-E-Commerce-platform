// Seed data shaped to match backend_routes_and_schema.md exactly: Decimal
// fields as numbers (mock only — real Prisma often serializes these as
// strings, which utils/product.js's toNumber() already tolerates), images
// as ProductImage[] ({url, displayOrder}), stock as Inventory[] rows per
// warehouse, uppercase enums for Role/OrderStatus/PaymentStatus.

const img = (seed, w = 600) => `https://picsum.photos/seed/${seed}/${w}/${w}`;

export const warehouses = [
  { id: 'w1', name: 'Chennai — Ambattur', city: 'Chennai', state: 'Tamil Nadu', pincode: '600058' },
  { id: 'w2', name: 'Coimbatore — Hub', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641004' },
  { id: 'w3', name: 'Bengaluru — Peenya', city: 'Bengaluru', state: 'Karnataka', pincode: '560058' },
];

export const categories = [
  { id: 'cat-tmt', name: 'TMT Bars', slug: 'tmt-bars', parentId: null, imageUrl: null, children: [] },
  { id: 'cat-structural', name: 'Structural Steel', slug: 'structural-steel', parentId: null, imageUrl: null, children: [] },
  { id: 'cat-pipes', name: 'Pipes & Tubes', slug: 'pipes-tubes', parentId: null, imageUrl: null, children: [] },
  { id: 'cat-sheets', name: 'Sheets & Plates', slug: 'sheets-plates', parentId: null, imageUrl: null, children: [] },
  { id: 'cat-wire', name: 'Wires & Mesh', slug: 'wires-mesh', parentId: null, imageUrl: null, children: [] },
];

const categoryById = (id) => categories.find((c) => c.id === id);

function inventoryFor(id, totalStock) {
  // Spread stock across warehouses so aggregateStock() in utils/product.js
  // has something real to sum.
  const w1 = Math.round(totalStock * 0.5);
  const w2 = Math.round(totalStock * 0.3);
  const w3 = totalStock - w1 - w2;
  return [
    { id: `${id}-inv-w1`, productId: id, warehouseId: 'w1', warehouse: warehouses[0], quantityAvailable: w1, quantityReserved: 0, reorderLevel: 20 },
    { id: `${id}-inv-w2`, productId: id, warehouseId: 'w2', warehouse: warehouses[1], quantityAvailable: w2, quantityReserved: 0, reorderLevel: 20 },
    { id: `${id}-inv-w3`, productId: id, warehouseId: 'w3', warehouse: warehouses[2], quantityAvailable: w3, quantityReserved: 0, reorderLevel: 20 },
  ];
}

const rawProducts = [
  { id: 'p1', name: 'Fe 500D TMT Bar 12mm', categoryId: 'cat-tmt', sku: 'AMK-TMT-12-500D', pricePerUnit: 52400, baseUnit: 'MT', minOrderQty: 1, totalStock: 240, description: 'Corrosion-resistant thermo-mechanically treated bar for RCC structures, ductile grade Fe 500D.', specifications: { grade: 'Fe 500D', diameterMm: 12, yieldStrength: '500 N/mm² min', standard: 'IS 1786:2008' } },
  { id: 'p2', name: 'Fe 500D TMT Bar 16mm', categoryId: 'cat-tmt', sku: 'AMK-TMT-16-500D', pricePerUnit: 51800, baseUnit: 'MT', minOrderQty: 1, totalStock: 12, description: 'High-strength TMT bar suited for columns and beams in seismic zones.', specifications: { grade: 'Fe 500D', diameterMm: 16, standard: 'IS 1786:2008' } },
  { id: 'p3', name: 'Fe 550 TMT Bar 20mm', categoryId: 'cat-tmt', sku: 'AMK-TMT-20-550', pricePerUnit: 53100, baseUnit: 'MT', minOrderQty: 1, totalStock: 0, description: 'Higher-grade TMT for heavy load-bearing applications.', specifications: { grade: 'Fe 550', diameterMm: 20, standard: 'IS 1786:2008' } },
  { id: 'p4', name: 'MS Structural Angle 50×50×6mm', categoryId: 'cat-structural', sku: 'AMK-ANG-50-6', pricePerUnit: 56.2, baseUnit: 'kg', minOrderQty: 500, totalStock: 8600, description: 'Equal angle mild steel section for trusses, frames and fabrication work.', specifications: { size: '50×50×6 mm', standard: 'IS 2062', lengthM: 6 } },
  { id: 'p5', name: 'MS I-Beam ISMB 200', categoryId: 'cat-structural', sku: 'AMK-ISMB-200', pricePerUnit: 58.4, baseUnit: 'kg', minOrderQty: 200, totalStock: 3400, description: 'Standard rolled steel I-beam for structural framing and support columns.', specifications: { section: 'ISMB 200', standard: 'IS 808', lengthM: 12 } },
  { id: 'p6', name: 'MS Channel ISMC 100', categoryId: 'cat-structural', sku: 'AMK-ISMC-100', pricePerUnit: 57.9, baseUnit: 'kg', minOrderQty: 300, totalStock: 65, description: 'C-channel section for purlins, rails and fabrication frames.', specifications: { section: 'ISMC 100', standard: 'IS 808' } },
  { id: 'p7', name: 'ERW MS Pipe Sch 40, 2"', categoryId: 'cat-pipes', sku: 'AMK-ERW-2-40', pricePerUnit: 64.8, baseUnit: 'kg', minOrderQty: 100, totalStock: 5200, description: 'Electric resistance welded pipe for plumbing, structural and fencing use.', specifications: { schedule: '40', nominalBoreIn: 2, standard: 'ASTM A53' } },
  { id: 'p8', name: 'GI Pipe Class B, 1.5"', categoryId: 'cat-pipes', sku: 'AMK-GI-1.5-B', pricePerUnit: 71.2, baseUnit: 'kg', minOrderQty: 100, totalStock: 2100, description: 'Hot-dip galvanised pipe for water lines and outdoor structural use.', specifications: { class: 'B', nominalBoreIn: 1.5, standard: 'IS 1239' } },
  { id: 'p9', name: 'Seamless MS Pipe 4"', categoryId: 'cat-pipes', sku: 'AMK-SML-4', pricePerUnit: 82.5, baseUnit: 'kg', minOrderQty: 50, totalStock: 18, description: 'Seamless pipe for high-pressure fluid transport applications.', specifications: { nominalBoreIn: 4, standard: 'IS 1239' } },
  { id: 'p10', name: 'HR Sheet 3mm', categoryId: 'cat-sheets', sku: 'AMK-HR-3', pricePerUnit: 58.9, baseUnit: 'kg', minOrderQty: 1000, totalStock: 9800, description: 'Hot-rolled steel sheet for fabrication, cladding and general engineering.', specifications: { thicknessMm: 3, standard: 'IS 2062', size: '2500×1250 mm' } },
  { id: 'p11', name: 'CR Sheet 1.2mm', categoryId: 'cat-sheets', sku: 'AMK-CR-1.2', pricePerUnit: 66.3, baseUnit: 'kg', minOrderQty: 500, totalStock: 4200, description: 'Cold-rolled sheet with smooth finish for enclosures and panels.', specifications: { thicknessMm: 1.2, standard: 'IS 513' } },
  { id: 'p12', name: 'MS Plate 10mm', categoryId: 'cat-sheets', sku: 'AMK-PLT-10', pricePerUnit: 60.1, baseUnit: 'kg', minOrderQty: 500, totalStock: 45, description: 'Heavy-gauge plate for base plates, gussets and structural fabrication.', specifications: { thicknessMm: 10, standard: 'IS 2062' } },
  { id: 'p13', name: 'Binding Wire 20 SWG', categoryId: 'cat-wire', sku: 'AMK-BWR-20', pricePerUnit: 62.0, baseUnit: 'kg', minOrderQty: 25, totalStock: 12000, description: 'Soft-annealed black wire for tying rebar on site.', specifications: { gauge: '20 SWG', standard: 'IS 280' } },
  { id: 'p14', name: 'Welded Wire Mesh 6mm', categoryId: 'cat-wire', sku: 'AMK-WWM-6', pricePerUnit: 68.5, baseUnit: 'kg', minOrderQty: 100, totalStock: 3100, description: 'Electro-welded mesh panels for slab reinforcement and fencing.', specifications: { wireDiaMm: 6, meshSize: '150×150 mm', standard: 'IS 1566' } },
];

export const products = rawProducts.map((p, idx) => ({
  id: p.id,
  categoryId: p.categoryId,
  category: categoryById(p.categoryId),
  name: p.name,
  slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  brand: null,
  sku: p.sku,
  hsnCode: '7214',
  gstRate: 18,
  description: p.description,
  baseUnit: p.baseUnit,
  pricePerUnit: p.pricePerUnit,
  discountPrice: idx === 0 ? Math.round(p.pricePerUnit * 0.97) : null,
  minOrderQty: p.minOrderQty,
  specifications: p.specifications,
  isActive: true,
  createdAt: new Date(Date.now() - idx * 86400000).toISOString(),
  updatedAt: new Date().toISOString(),
  images: [
    { id: `${p.id}-img1`, productId: p.id, url: img(p.id, 800), displayOrder: 0 },
    { id: `${p.id}-img2`, productId: p.id, url: img(p.id + '-b', 800), displayOrder: 1 },
    { id: `${p.id}-img3`, productId: p.id, url: img(p.id + '-c', 800), displayOrder: 2 },
  ],
  inventory: inventoryFor(p.id, p.totalStock),
  avgRating: [4.6, 4.2, 4.8, 4.0, 4.5, 4.3, 4.7, 4.1, 4.4, 4.9, 4.2, 4.6, 4.3, 4.5][idx],
  reviewCount: [34, 12, 58, 9, 21, 15, 44, 7, 19, 63, 11, 27, 8, 16][idx],
  isWishlisted: false,
}));

export const reviewsByProduct = {
  p1: [
    { id: 'r1', userId: 'u2', user: { name: 'Karthik R.' }, productId: 'p1', rating: 5, comment: 'Consistent quality across bundles, mill test certs matched every batch.', createdAt: new Date(Date.now() - 14 * 86400000).toISOString() },
    { id: 'r2', userId: 'u3', user: { name: 'Priya S.' }, productId: 'p1', rating: 4, comment: 'Good pricing, delivery took a day longer than quoted.', createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  ],
  p7: [
    { id: 'r3', userId: 'u3', user: { name: 'Anand M.' }, productId: 'p7', rating: 5, comment: 'Exactly to spec, used for site scaffolding without issues.', createdAt: new Date(Date.now() - 21 * 86400000).toISOString() },
  ],
};

export function findProduct(idOrSlug) {
  return products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

function shippingAddressFor(addr) {
  return { label: addr.label, line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode };
}

// ---- Mutable in-memory state (persists for the browser session only) ----
export const mockState = {
  user: {
    id: 'u1',
    name: 'Boovesh Kumar',
    email: 'boovesh@amksteels.in',
    phone: '9876543210',
    gstin: null,
    role: 'ADMIN', // switch to 'CUSTOMER' to preview the plain storefront
    isActive: true,
    emailVerified: true,
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
  },
  addresses: [
    { id: 'a1', label: 'Site office', line1: 'Plot 14, Ambattur Industrial Estate', line2: 'Near MEPZ Junction', city: 'Chennai', state: 'Tamil Nadu', pincode: '600058', isDefault: true },
  ],
  wishlistIds: new Set(['p2', 'p10']),
  cartItems: [
    { id: 'ci1', productId: 'p1', productName: 'Fe 500D TMT Bar 12mm', unitPrice: 52400, quantity: 2 },
    { id: 'ci2', productId: 'p7', productName: 'ERW MS Pipe Sch 40, 2"', unitPrice: 64.8, quantity: 5 },
  ],
  adminUsers: [
    { id: 'u1', name: 'Boovesh Kumar', email: 'boovesh@amksteels.in', phone: '9876543210', role: 'ADMIN', createdAt: new Date(Date.now() - 200 * 86400000).toISOString() },
    { id: 'u2', name: 'Karthik R.', email: 'karthik.r@buildcorp.in', phone: '9123456780', role: 'CUSTOMER', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    { id: 'u3', name: 'Priya S.', email: 'priya.s@site-ops.in', phone: '9988776655', role: 'STAFF', createdAt: new Date(Date.now() - 40 * 86400000).toISOString() },
    { id: 'u4', name: 'Anand Murthy', email: 'anand.murthy@gmail.com', phone: '9012345678', role: 'CUSTOMER', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  ],
};

function buildOrder(id, orderNumber, createdAt, status, paymentStatus, itemDefs, addressId) {
  const address = mockState.addresses.find((a) => a.id === addressId) || mockState.addresses[0];
  const items = itemDefs.map((d, i) => {
    const product = findProduct(d.productId);
    const unitPrice = product.pricePerUnit;
    const subtotal = unitPrice * d.quantity;
    return {
      id: `${id}-item${i}`,
      orderId: id,
      productId: product.id,
      productName: product.name,
      specs: product.specifications,
      unitPrice,
      quantity: d.quantity,
      subtotal,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const gstAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gstAmount;
  return {
    id,
    orderNumber,
    userId: mockState.user.id,
    items,
    trackingEvents: [
      { id: `${id}-ev1`, orderId: id, status: 'CONFIRMED', note: 'Order confirmed', location: null, timestamp: createdAt },
      ...(status !== 'CONFIRMED' && status !== 'PENDING'
        ? [{ id: `${id}-ev2`, orderId: id, status, note: null, location: 'Chennai — Ambattur', timestamp: new Date().toISOString() }]
        : []),
    ],
    shippingAddress: shippingAddressFor(address),
    buyerGstin: null,
    subtotal,
    gstAmount,
    totalAmount,
    status,
    paymentStatus,
    paymentId: paymentStatus === 'PAID' ? 'pay_mock123' : null,
    razorpayOrderId: 'order_mock123',
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

mockState.orders = [
  buildOrder('o1001', 'AMK-1001', new Date(Date.now() - 3 * 86400000).toISOString(), 'SHIPPED', 'PAID', [{ productId: 'p1', quantity: 2 }, { productId: 'p10', quantity: 1000 }], 'a1'),
  buildOrder('o1000', 'AMK-1000', new Date(Date.now() - 21 * 86400000).toISOString(), 'DELIVERED', 'PAID', [{ productId: 'p7', quantity: 500 }], 'a1'),
];
