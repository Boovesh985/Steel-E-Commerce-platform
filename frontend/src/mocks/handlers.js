import MockAdapter from 'axios-mock-adapter';
import apiClient from '../api/client';
import { categories, products, reviewsByProduct, mockState, warehouses, findProduct } from './data';

let uid = 1000;
const nextId = (prefix) => `${prefix}-${++uid}`;

// Every real response is wrapped as { success, data, error } — mirror that
// here so client.js's unwrap interceptor behaves identically to production.
const ok = (data) => ({ success: true, data, error: null });
const fail = (code, message) => ({ success: false, data: null, error: { code, message } });

function paginate(list, page = 1, limit = 20) {
  const items = list.slice((Number(page) - 1) * Number(limit), (Number(page) - 1) * Number(limit) + Number(limit));
  return { items, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / Number(limit))), page: Number(page) };
}

function withWishlist(list) {
  return list.map((p) => ({ ...p, isWishlisted: mockState.wishlistIds.has(p.id) }));
}

function requireAuth(config) {
  return !!config.headers?.Authorization;
}

/**
 * Installs an in-memory mock backend matching backend_routes_and_schema.md:
 * same base path shape, same { success, data, error } envelope, same field
 * names (pricePerUnit/baseUnit/images[]/inventory[]/uppercase enums), and
 * the same (deliberately smaller) route surface — no coupons, freight,
 * invoices, reorder, or return-request endpoints exist on the real backend,
 * so they don't exist here either.
 */
export function enableMocks() {
  const mock = new MockAdapter(apiClient, { delayResponse: 450 });

  // ---- Auth ----
  mock.onPost('/auth/register').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    mockState.user = { ...mockState.user, ...body, id: mockState.user.id, role: 'CUSTOMER' };
    return [200, ok({ user: mockState.user, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' })];
  });
  mock.onPost('/auth/login').reply(200, ok({ user: mockState.user, accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' }));
  mock.onPost('/auth/refresh').reply(200, ok({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' }));
  mock.onPost('/auth/logout').reply(200, ok({ loggedOut: true }));
  mock.onPost('/auth/forgot-password').reply(200, ok({ message: 'Reset instructions sent (mock — no email is actually sent).' }));
  mock.onPost('/auth/reset-password').reply(200, ok({ message: 'Password reset.' }));

  // ---- Users ----
  mock.onGet('/users/me').reply(200, ok(mockState.user));
  mock.onPut('/users/me').reply((config) => {
    mockState.user = { ...mockState.user, ...JSON.parse(config.data || '{}') };
    return [200, ok(mockState.user)];
  });
  mock.onGet('/users/me/addresses').reply(200, ok(mockState.addresses));
  mock.onPost('/users/me/addresses').reply((config) => {
    const addr = { id: nextId('addr'), isDefault: false, ...JSON.parse(config.data || '{}') };
    mockState.addresses.push(addr);
    return [200, ok(addr)];
  });
  mock.onPut(/\/users\/me\/addresses\/.+/).reply((config) => {
    const id = config.url.split('/').pop();
    const idx = mockState.addresses.findIndex((a) => a.id === id);
    if (idx === -1) return [404, fail('NOT_FOUND', 'Address not found')];
    mockState.addresses[idx] = { ...mockState.addresses[idx], ...JSON.parse(config.data || '{}') };
    return [200, ok(mockState.addresses[idx])];
  });
  mock.onDelete(/\/users\/me\/addresses\/.+/).reply((config) => {
    const id = config.url.split('/').pop();
    mockState.addresses = mockState.addresses.filter((a) => a.id !== id);
    return [200, ok({ deleted: true })];
  });

  // ---- Categories ----
  mock.onGet('/categories').reply(200, ok(categories));

  // ---- Products: reviews (registered before the generic :id route) ----
  mock.onGet(/\/products\/[^/]+\/reviews$/).reply((config) => {
    const id = config.url.split('/')[2];
    return [200, ok(reviewsByProduct[id] || [])];
  });
  mock.onPost(/\/products\/[^/]+\/reviews$/).reply((config) => {
    if (!requireAuth(config)) return [401, fail('UNAUTHORIZED', 'Sign in required')];
    const id = config.url.split('/')[2];
    const body = JSON.parse(config.data || '{}');
    const review = { id: nextId('rev'), userId: mockState.user.id, user: { name: mockState.user.name }, productId: id, createdAt: new Date().toISOString(), ...body };
    reviewsByProduct[id] = [review, ...(reviewsByProduct[id] || [])];
    return [200, ok(review)];
  });

  // ---- Products: list ----
  mock.onGet('/products').reply((config) => {
    const { category, q, minPrice, maxPrice, brand, sort, page, limit } = config.params || {};
    let list = [...products];
    if (category) list = list.filter((p) => p.category?.slug === category);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(String(q).toLowerCase()));
    if (minPrice) list = list.filter((p) => p.pricePerUnit >= Number(minPrice));
    if (maxPrice) list = list.filter((p) => p.pricePerUnit <= Number(maxPrice));
    if (brand) list = list.filter((p) => p.brand === brand);
    if (sort === 'price_asc') list.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    if (sort === 'price_desc') list.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
    if (sort === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'name_desc') list.sort((a, b) => b.name.localeCompare(a.name));
    if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return [200, ok(paginate(withWishlist(list), page, limit))];
  });

  // ---- Products: get by id or slug (generic — must come after /products and /products/:id/reviews) ----
  mock.onGet(/^\/products\/[^/]+$/).reply((config) => {
    const idOrSlug = config.url.split('/').pop();
    const product = findProduct(idOrSlug);
    return product ? [200, ok({ ...product, isWishlisted: mockState.wishlistIds.has(product.id) })] : [404, fail('NOT_FOUND', 'Product not found')];
  });

  // ---- Wishlist ----
  mock.onGet('/wishlist').reply(200, ok(withWishlist(products.filter((p) => mockState.wishlistIds.has(p.id)))));
  mock.onPost('/wishlist').reply((config) => {
    const { productId } = JSON.parse(config.data || '{}');
    mockState.wishlistIds.add(productId);
    return [200, ok({ added: true })];
  });
  mock.onDelete(/\/wishlist\/.+/).reply((config) => {
    mockState.wishlistIds.delete(config.url.split('/').pop());
    return [200, ok({ removed: true })];
  });

  // ---- Cart ----
  mock.onGet('/cart').reply(200, ok({ id: 'cart-mock', userId: mockState.user.id, items: mockState.cartItems, updatedAt: new Date().toISOString() }));
  mock.onPost('/cart/items').reply((config) => {
    const { productId, quantity } = JSON.parse(config.data || '{}');
    const product = findProduct(productId);
    if (!product) return [404, fail('NOT_FOUND', 'Product not found')];
    const existing = mockState.cartItems.find((ci) => ci.productId === productId);
    if (existing) existing.quantity += quantity;
    else mockState.cartItems.push({ id: nextId('ci'), productId, productName: product.name, unitPrice: product.pricePerUnit, quantity });
    return [200, ok({ id: 'cart-mock', items: mockState.cartItems })];
  });
  mock.onPut(/\/cart\/items\/.+/).reply((config) => {
    const id = config.url.split('/').pop();
    const { quantity } = JSON.parse(config.data || '{}');
    const item = mockState.cartItems.find((ci) => ci.id === id);
    if (item) item.quantity = quantity;
    return [200, ok({ id: 'cart-mock', items: mockState.cartItems })];
  });
  mock.onDelete(/\/cart\/items\/.+/).reply((config) => {
    const id = config.url.split('/').pop();
    mockState.cartItems = mockState.cartItems.filter((ci) => ci.id !== id);
    return [200, ok({ id: 'cart-mock', items: mockState.cartItems })];
  });
  mock.onDelete('/cart').reply(() => {
    mockState.cartItems = [];
    return [200, ok({ cleared: true })];
  });

  // ---- Orders ----
  mock.onPost('/orders').reply((config) => {
    const { addressId, buyerGstin, notes } = JSON.parse(config.data || '{}');
    const address = mockState.addresses.find((a) => a.id === addressId) || mockState.addresses[0];
    const items = mockState.cartItems.map((ci, i) => {
      const product = findProduct(ci.productId);
      const subtotal = ci.unitPrice * ci.quantity;
      return { id: nextId('oi'), productId: ci.productId, productName: ci.productName, specs: product?.specifications || {}, unitPrice: ci.unitPrice, quantity: ci.quantity, subtotal };
    });
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const gstAmount = Math.round(subtotal * 0.18);
    const order = {
      id: nextId('o'),
      orderNumber: `AMK-${1000 + mockState.orders.length + 1}`,
      userId: mockState.user.id,
      items,
      trackingEvents: [{ id: nextId('ev'), status: 'CONFIRMED', note: 'Order confirmed', location: null, timestamp: new Date().toISOString() }],
      shippingAddress: { label: address.label, line1: address.line1, line2: address.line2, city: address.city, state: address.state, pincode: address.pincode },
      buyerGstin: buyerGstin || null,
      notes: notes || null,
      subtotal,
      gstAmount,
      totalAmount: subtotal + gstAmount,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentId: null,
      razorpayOrderId: 'order_mock123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockState.orders.unshift(order);
    mockState.cartItems = [];
    return [200, ok(order)];
  });
  mock.onGet('/orders').reply((config) => {
    const { status, page, limit } = config.params || {};
    let list = mockState.orders;
    if (status) list = list.filter((o) => o.status === status);
    return [200, ok(paginate(list, page, limit))];
  });
  mock.onGet(/\/orders\/[^/]+\/tracking$/).reply((config) => {
    const id = config.url.split('/')[2];
    const order = mockState.orders.find((o) => o.id === id);
    return [200, ok(order?.trackingEvents || [])];
  });
  mock.onGet(/^\/orders\/[^/]+$/).reply((config) => {
    const id = config.url.split('/').pop();
    const order = mockState.orders.find((o) => o.id === id);
    return order ? [200, ok(order)] : [404, fail('NOT_FOUND', 'Order not found')];
  });
  mock.onPut(/\/orders\/[^/]+\/cancel$/).reply((config) => {
    const id = config.url.split('/')[2];
    const order = mockState.orders.find((o) => o.id === id);
    if (!order) return [404, fail('NOT_FOUND', 'Order not found')];
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) return [400, fail('INVALID_STATE', 'Order can no longer be cancelled')];
    order.status = 'CANCELLED';
    order.trackingEvents.push({ id: nextId('ev'), status: 'CANCELLED', note: 'Cancelled by customer', location: null, timestamp: new Date().toISOString() });
    return [200, ok(order)];
  });

  // ---- Payments ----
  mock.onPost('/payments/create-order').reply((config) => {
    const { orderId } = JSON.parse(config.data || '{}');
    const order = mockState.orders.find((o) => o.id === orderId);
    return [200, ok({ razorpayOrderId: 'order_mock123', amount: Math.round((order?.totalAmount || 0) * 100), currency: 'INR' })];
  });
  mock.onPost('/payments/verify').reply((config) => {
    const order = mockState.orders.find((o) => o.razorpayOrderId === 'order_mock123' && o.status === 'PENDING');
    if (order) {
      order.paymentStatus = 'PAID';
      order.status = 'CONFIRMED';
      order.paymentId = 'pay_mock123';
    }
    return [200, ok({ verified: true })];
  });

  // ---- Admin: dashboard ----
  mock.onGet('/admin/dashboard').reply(200, ok({
    totalRevenue: mockState.orders.reduce((s, o) => s + o.totalAmount, 0),
    totalOrders: mockState.orders.length,
    totalUsers: mockState.adminUsers.length,
    lowStockItems: products
      .filter((p) => p.inventory.reduce((s, r) => s + r.quantityAvailable, 0) <= 50)
      .map((p) => ({ id: p.id, productId: p.id, name: p.name, quantityAvailable: p.inventory.reduce((s, r) => s + r.quantityAvailable, 0) })),
    recentOrders: mockState.orders.slice(0, 6).map((o) => ({ ...o, customerName: mockState.user.name, user: { name: mockState.user.name } })),
  }));

  // ---- Admin: orders ----
  mock.onGet('/admin/orders').reply((config) => {
    const { status, page, limit } = config.params || {};
    let list = mockState.orders.map((o) => ({ ...o, customerName: mockState.user.name, user: { name: mockState.user.name } }));
    if (status) list = list.filter((o) => o.status === status);
    return [200, ok(paginate(list, page, limit))];
  });
  mock.onPut(/\/admin\/orders\/[^/]+\/status$/).reply((config) => {
    const id = config.url.split('/')[3];
    const { status, note, location } = JSON.parse(config.data || '{}');
    const order = mockState.orders.find((o) => o.id === id);
    if (!order) return [404, fail('NOT_FOUND', 'Order not found')];
    order.status = status;
    order.trackingEvents.push({ id: nextId('ev'), status, note: note || null, location: location || null, timestamp: new Date().toISOString() });
    return [200, ok(order)];
  });

  // ---- Admin: products ----
  mock.onPost('/admin/products').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const category = categories.find((c) => c.id === body.categoryId);
    const product = {
      id: nextId('p'),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: body.images || [],
      inventory: [],
      avgRating: 0,
      reviewCount: 0,
      ...body,
      category,
      slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    };
    products.push(product);
    return [200, ok(product)];
  });
  mock.onPut(/\/admin\/products\/[^/]+$/).reply((config) => {
    const id = config.url.split('/').pop();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return [404, fail('NOT_FOUND', 'Product not found')];
    const body = JSON.parse(config.data || '{}');
    products[idx] = { ...products[idx], ...body, category: body.categoryId ? categories.find((c) => c.id === body.categoryId) : products[idx].category };
    return [200, ok(products[idx])];
  });
  mock.onDelete(/\/admin\/products\/[^/]+$/).reply((config) => {
    const id = config.url.split('/').pop();
    const product = products.find((p) => p.id === id);
    if (product) product.isActive = false;
    return [200, ok({ deactivated: true })];
  });
  mock.onPost('/admin/products/import').reply((config) => {
    const { products: imported } = JSON.parse(config.data || '{}');
    (imported || []).forEach((p) => products.push({ id: nextId('p'), isActive: true, images: [], inventory: [], avgRating: 0, reviewCount: 0, createdAt: new Date().toISOString(), ...p, slug: (p.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
    return [200, ok({ imported: imported?.length || 0 })];
  });

  // ---- Admin: categories ----
  mock.onPost('/admin/categories').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    const category = { id: nextId('cat'), children: [], ...body };
    categories.push(category);
    return [200, ok(category)];
  });

  // ---- Admin: inventory ----
  mock.onGet('/admin/inventory').reply((config) => {
    const { warehouseId, lowStock, page, limit } = config.params || {};
    let rows = [];
    products.forEach((p) => {
      p.inventory.forEach((row) => rows.push({ ...row, product: { id: p.id, name: p.name }, productName: p.name, warehouse: row.warehouse, warehouseName: row.warehouse?.name }));
    });
    if (warehouseId) rows = rows.filter((r) => r.warehouseId === warehouseId);
    if (lowStock) rows = rows.filter((r) => r.quantityAvailable - r.quantityReserved <= r.reorderLevel);
    return [200, ok(paginate(rows, page, limit))];
  });
  mock.onPut(/\/admin\/inventory\/[^/]+$/).reply((config) => {
    const productId = config.url.split('/').pop();
    const body = JSON.parse(config.data || '{}');
    const product = products.find((p) => p.id === productId);
    if (!product) return [404, fail('NOT_FOUND', 'Product not found')];
    const row = product.inventory.find((r) => r.warehouseId === body.warehouseId) || product.inventory[0];
    if (row) {
      if (body.quantityAvailable !== undefined) row.quantityAvailable = body.quantityAvailable;
      if (body.quantityReserved !== undefined) row.quantityReserved = body.quantityReserved;
      if (body.reorderLevel !== undefined) row.reorderLevel = body.reorderLevel;
    }
    return [200, ok(row)];
  });

  // ---- Admin: users ----
  mock.onGet('/admin/users').reply((config) => {
    const { role, q, page, limit } = config.params || {};
    let list = mockState.adminUsers;
    if (role) list = list.filter((u) => u.role === role);
    if (q) list = list.filter((u) => u.name.toLowerCase().includes(String(q).toLowerCase()) || u.email.toLowerCase().includes(String(q).toLowerCase()));
    return [200, ok(paginate(list, page, limit))];
  });
  mock.onPut(/\/admin\/users\/[^/]+\/role$/).reply((config) => {
    const id = config.url.split('/')[3];
    const { role } = JSON.parse(config.data || '{}');
    const user = mockState.adminUsers.find((u) => u.id === id);
    if (user) user.role = role;
    return [200, ok(user)];
  });

  // Anything else: pass through untouched (harmless no-op if nothing's listening).
  mock.onAny().passThrough();
}
