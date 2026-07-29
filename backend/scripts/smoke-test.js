/**
 * Smoke test script — end-to-end verification of Phase 1 APIs.
 * Tests: Auth → Products → Cart → Checkout → Orders → Tracking → Admin → Security
 *
 * Usage: node scripts/smoke-test.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const BASE = `http://localhost:${process.env.PORT || 4000}/api`;
let passed = 0;
let failed = 0;

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  let data;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { success: false, error: { code: 'NON_JSON', message: text.substring(0, 200) } };
  }
  return { status: res.status, data };
}

function assert(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

async function run() {
  console.log('\n🧪 AMK Steels Phase 1 — Smoke Test Suite');
  console.log('═══════════════════════════════════════════\n');

  // ── 1. Health Check ────────────────────────────────────────
  console.log('1️⃣  Health Check');
  const health = await api('GET', '/health');
  assert('Health endpoint returns 200', health.status === 200);
  assert('Status is ok', health.data.data.status === 'ok');

  // ── 2. Auth: Register ──────────────────────────────────────
  console.log('\n2️⃣  Auth: Registration');
  const reg = await api('POST', '/auth/register', {
    name: 'Smoke Tester', email: 'smoketest@test.com', phone: '9123456780', password: 'SmokeTest@123',
  });
  assert('Register returns 201', reg.status === 201);
  assert('Returns user data', !!reg.data.data?.user?.id);
  assert('Returns access token', !!reg.data.data?.accessToken);
  assert('Returns refresh token', !!reg.data.data?.refreshToken);
  assert('Role is CUSTOMER', reg.data.data?.user?.role === 'CUSTOMER');

  const customerToken = reg.data.data?.accessToken;
  const refreshToken = reg.data.data?.refreshToken;

  // ── 3. Auth: Duplicate registration ────────────────────────
  console.log('\n3️⃣  Auth: Duplicate Registration');
  const dup = await api('POST', '/auth/register', {
    name: 'Dup', email: 'smoketest@test.com', phone: '9123456789', password: 'DupPass@123',
  });
  assert('Duplicate email returns 409', dup.status === 409);

  // ── 4. Auth: Login ─────────────────────────────────────────
  console.log('\n4️⃣  Auth: Login');
  const login = await api('POST', '/auth/login', {
    email: 'smoketest@test.com', password: 'SmokeTest@123',
  });
  assert('Login returns 200', login.status === 200);
  assert('Login returns tokens', !!login.data.data?.accessToken);

  // ── 5. Auth: Refresh Token ─────────────────────────────────
  console.log('\n5️⃣  Auth: Refresh Token');
  const refresh = await api('POST', '/auth/refresh', { refreshToken });
  assert('Refresh returns 200', refresh.status === 200);
  assert('Returns new access token', !!refresh.data.data?.accessToken);

  // ── 6. Auth: Admin Login ───────────────────────────────────
  console.log('\n6️⃣  Auth: Admin Login');
  const adminLogin = await api('POST', '/auth/login', {
    email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  assert('Admin login returns 200', adminLogin.status === 200);
  assert('Admin role is ADMIN', adminLogin.data.data?.user?.role === 'ADMIN');
  const adminToken = adminLogin.data.data?.accessToken;

  // ── 7. Categories ──────────────────────────────────────────
  console.log('\n7️⃣  Categories');
  const cats = await api('GET', '/categories');
  assert('Categories returns 200', cats.status === 200);
  assert('Has category tree', cats.data.data?.length > 0);
  assert('Parent category is Pipes', cats.data.data[0]?.name === 'Pipes');
  assert('Has 3 subcategories', cats.data.data[0]?.children?.length === 3);

  // ── 8. Products: List ──────────────────────────────────────
  console.log('\n8️⃣  Products: List & Pagination');
  const prods = await api('GET', '/products?limit=5');
  assert('Products returns 200', prods.status === 200);
  assert('Returns array of products', Array.isArray(prods.data.data));
  assert('Returns 5 products', prods.data.data.length === 5);
  assert('Has pagination', !!prods.data.pagination);
  assert('Total is 273', prods.data.pagination.total === 273);

  // ── 9. Products: Search ────────────────────────────────────
  console.log('\n9️⃣  Products: Search');
  const search = await api('GET', '/products?q=80x40&limit=5');
  assert('Search returns results', search.data.data?.length > 0);
  
  // ── 10. Products: Filter by category ───────────────────────
  console.log('\n🔟 Products: Category Filter');
  const catFilter = await api('GET', '/products?category=ms-pipes-round&limit=5');
  assert('Category filter returns results', catFilter.data.data?.length > 0);

  // ── 11. Products: Filter by brand ──────────────────────────
  console.log('\n1️⃣1️⃣ Products: Brand Filter');
  const brandFilter = await api('GET', '/products?brand=Apollo&limit=3');
  assert('Brand filter returns results', brandFilter.data.data?.length > 0);
  assert('All results are Apollo brand', brandFilter.data.data.every(p => p.brand === 'Apollo'));

  // ── 12. Product Detail ─────────────────────────────────────
  console.log('\n1️⃣2️⃣ Product Detail');
  const productId = prods.data.data[0].id;
  const detail = await api('GET', `/products/${productId}`);
  assert('Product detail returns 200', detail.status === 200);
  assert('Has specifications', !!detail.data.data?.specifications);
  assert('Has inventory data', Array.isArray(detail.data.data?.inventory));

  // ── 13. User Profile ───────────────────────────────────────
  console.log('\n1️⃣3️⃣ User Profile');
  const profile = await api('GET', '/users/me', null, customerToken);
  assert('Profile returns 200', profile.status === 200);
  assert('Returns correct email', profile.data.data?.email === 'smoketest@test.com');

  // ── 14. Address CRUD ───────────────────────────────────────
  console.log('\n1️⃣4️⃣ Address CRUD');
  const addr = await api('POST', '/users/me/addresses', {
    label: 'Office', line1: '123 Test Street', city: 'Trichy', state: 'Tamil Nadu', pincode: '620001', isDefault: true,
  }, customerToken);
  assert('Create address returns 201', addr.status === 201);
  const addressId = addr.data.data?.id;

  const addrList = await api('GET', '/users/me/addresses', null, customerToken);
  assert('List addresses returns results', addrList.data.data?.length > 0);

  // ── 15. Cart: Add Item ─────────────────────────────────────
  console.log('\n1️⃣5️⃣ Cart: Add Item');
  // Find a product with stock (search all products)
  const inStockProds = await api('GET', '/products?limit=273&sort=name_asc');
  const inStockProduct = inStockProds.data.data.find(p => p.totalStock > 0);
  
  let cartProductId, cartProductStock;
  if (inStockProduct) {
    cartProductId = inStockProduct.id;
    cartProductStock = inStockProduct.totalStock;
  } else {
    cartProductId = productId; // Use first product even if 0 stock
    cartProductStock = 0;
  }

  const addCart = await api('POST', '/cart/items', {
    productId: cartProductId, quantity: 2,
  }, customerToken);
  assert('Add to cart returns 200/201', [200, 201].includes(addCart.status));

  // ── 16. Cart: Get Cart ─────────────────────────────────────
  console.log('\n1️⃣6️⃣ Cart: View Cart');
  const cart = await api('GET', '/cart', null, customerToken);
  assert('Get cart returns 200', cart.status === 200);
  assert('Cart has items', cart.data.data?.items?.length > 0);

  // ── 17. Cart: Update Quantity ──────────────────────────────
  console.log('\n1️⃣7️⃣ Cart: Update Quantity');
  const cartItemId = cart.data.data?.items?.[0]?.id;
  if (cartItemId) {
    const updateCart = await api('PUT', `/cart/items/${cartItemId}`, { quantity: 1 }, customerToken);
    assert('Update cart item returns 200', updateCart.status === 200);
  }

  // ── 18. Checkout (if stock available) ──────────────────────
  console.log('\n1️⃣8️⃣ Checkout');
  if (cartProductStock > 0 && addressId) {
    const order = await api('POST', '/orders', { addressId }, customerToken);
    assert('Checkout returns 201', order.status === 201);
    assert('Order has orderNumber', !!order.data.data?.orderNumber);
    assert('Order status is PENDING', order.data.data?.status === 'PENDING');
    assert('Order has items', order.data.data?.items?.length > 0);

    const orderId = order.data.data?.id;

    // ── 19. Order Detail ─────────────────────────────────────
    console.log('\n1️⃣9️⃣ Order Detail');
    const orderDetail = await api('GET', `/orders/${orderId}`, null, customerToken);
    assert('Order detail returns 200', orderDetail.status === 200);

    // ── 20. Order Tracking ───────────────────────────────────
    console.log('\n2️⃣0️⃣ Order Tracking');
    const tracking = await api('GET', `/orders/${orderId}/tracking`, null, customerToken);
    assert('Tracking returns 200', tracking.status === 200);
    assert('Has initial PENDING event', tracking.data.data?.events?.length >= 1);

    // ── 21. Admin: Update Order Status → auto tracking event
    console.log('\n2️⃣1️⃣ Admin: Update Order Status');
    const confirm = await api('PUT', `/admin/orders/${orderId}/status`, {
      status: 'CONFIRMED', note: 'Order confirmed by admin',
    }, adminToken);
    assert('Admin status update returns 200', confirm.status === 200);
    assert('Status changed to CONFIRMED', confirm.data.data?.status === 'CONFIRMED');

    const shipped = await api('PUT', `/admin/orders/${orderId}/status`, {
      status: 'SHIPPED', note: 'Dispatched from Trichy warehouse', location: 'Kajapettai, Trichy',
    }, adminToken);
    assert('Ship status update returns 200', shipped.status === 200);

    // ── 22. Verify Tracking Events in Order ──────────────────
    console.log('\n2️⃣2️⃣ Verify Tracking Timeline');
    const trackAfter = await api('GET', `/orders/${orderId}/tracking`, null, customerToken);
    const events = trackAfter.data.data?.events || [];
    assert('Has 3 tracking events (PENDING→CONFIRMED→SHIPPED)', events.length === 3);
    assert('Events in chronological order', events.length >= 2 ? new Date(events[0].timestamp) <= new Date(events[events.length - 1].timestamp) : true);

    // ── 23. Insufficient stock rejection ─────────────────────
    console.log('\n2️⃣3️⃣ Insufficient Stock Rejection');
    // Add a huge quantity to cart and try checkout
    await api('POST', '/cart/items', { productId: cartProductId, quantity: 999999 }, customerToken);
    const addr2 = await api('POST', '/users/me/addresses', {
      label: 'Home', line1: '456 Test Rd', city: 'Trichy', state: 'Tamil Nadu', pincode: '620002',
    }, customerToken);
    const failOrder = await api('POST', '/orders', { addressId: addr2.data.data?.id }, customerToken);
    assert('Insufficient stock returns 409', failOrder.status === 409);
  } else {
    console.log('  ⚠️  Skipping checkout tests — no products with stock');
  }

  // ── 24. Wishlist ───────────────────────────────────────────
  console.log('\n2️⃣4️⃣ Wishlist');
  const addWish = await api('POST', '/wishlist', { productId: productId }, customerToken);
  assert('Add to wishlist returns 201', addWish.status === 201);
  const wishlist = await api('GET', '/wishlist', null, customerToken);
  assert('Wishlist has items', wishlist.data.data?.length > 0);
  const removeWish = await api('DELETE', `/wishlist/${productId}`, null, customerToken);
  assert('Remove from wishlist returns 200', removeWish.status === 200);

  // ── 25. Admin: Dashboard ───────────────────────────────────
  console.log('\n2️⃣5️⃣ Admin Dashboard');
  const dashboard = await api('GET', '/admin/dashboard', null, adminToken);
  assert('Dashboard returns 200', dashboard.status === 200);
  assert('Has totalProducts', dashboard.data.data?.totalProducts === 273);
  assert('Has totalUsers', dashboard.data.data?.totalUsers >= 2);

  // ── 26. Admin: Inventory ───────────────────────────────────
  console.log('\n2️⃣6️⃣ Admin Inventory');
  const inv = await api('GET', '/admin/inventory?limit=5', null, adminToken);
  assert('Inventory list returns 200', inv.status === 200);
  assert('Has inventory records', inv.data.data?.length > 0);

  // ── 27. Admin: User List ───────────────────────────────────
  console.log('\n2️⃣7️⃣ Admin User Management');
  const users = await api('GET', '/admin/users', null, adminToken);
  assert('User list returns 200', users.status === 200);
  assert('Has users', users.data.data?.length >= 2);

  // ── 28. Security: No token ─────────────────────────────────
  console.log('\n2️⃣8️⃣ Security: No Token');
  const noToken = await api('GET', '/users/me');
  assert('No token returns 401', noToken.status === 401);

  // ── 29. Security: Customer accessing admin ─────────────────
  console.log('\n2️⃣9️⃣ Security: Customer → Admin');
  const forbidden = await api('GET', '/admin/dashboard', null, customerToken);
  assert('Customer on admin route returns 403', forbidden.status === 403);

  // ── 30. Security: Malformed input ──────────────────────────
  console.log('\n3️⃣0️⃣ Security: Malformed Input');
  const malformed = await api('POST', '/auth/register', { email: 'not-an-email' });
  assert('Malformed input returns 400, not 500', malformed.status === 400);

  // ── 31. 404 handler ────────────────────────────────────────
  console.log('\n3️⃣1️⃣ 404 Handler');
  const notFound = await api('GET', '/nonexistent');
  assert('Unknown route returns 404', notFound.status === 404);

  // ── 32. Review ─────────────────────────────────────────────
  console.log('\n3️⃣2️⃣ Product Review');
  const review = await api('POST', `/products/${productId}/reviews`, {
    rating: 5, comment: 'Great steel pipe!',
  }, customerToken);
  assert('Create review returns 201', review.status === 201);

  const dupReview = await api('POST', `/products/${productId}/reviews`, {
    rating: 4, comment: 'Duplicate',
  }, customerToken);
  assert('Duplicate review returns 409', dupReview.status === 409);

  // ═══════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════');
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Phase 1 is verified.\n');
  } else {
    console.log(`⚠️  ${failed} test(s) need attention.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('❌ Smoke test crashed:', err);
  process.exit(1);
});
