# AMK Steels — API Documentation

> Base URL: `http://localhost:4000/api`
> All responses follow: `{ "success": boolean, "data": ..., "error?": { "code": string, "message": string } }`
> Paginated responses add: `"pagination": { "page", "limit", "total", "totalPages" }`

---

## Authentication

All authenticated routes require header: `Authorization: Bearer <accessToken>`

### POST /api/auth/register
- **Auth:** Public
- **Body:** `{ "name": string, "email": string, "phone": string, "password": string, "gstin?": string }`
- **Response (201):** `{ user, accessToken, refreshToken }`
- **Errors:** 409 (duplicate email/phone), 400 (validation)

### POST /api/auth/login
- **Auth:** Public
- **Body:** `{ "email": string, "password": string }`
- **Response (200):** `{ user, accessToken, refreshToken }`
- **Errors:** 401 (invalid credentials), 403 (account disabled)

### POST /api/auth/refresh
- **Auth:** Refresh token in body
- **Body:** `{ "refreshToken": string }`
- **Response (200):** `{ accessToken }`
- **Errors:** 401 (invalid/expired token)

### POST /api/auth/logout
- **Auth:** Required
- **Body:** `{ "refreshToken": string }`
- **Response (200):** `{ message: "Logged out successfully." }`

### POST /api/auth/forgot-password
- **Auth:** Public
- **Body:** `{ "email": string }`
- **Response (200):** `{ message: "If that email exists, a reset link has been sent." }`
- **Note:** Phase 1 logs the reset token to console. Phase 2+ will send via email.

### POST /api/auth/reset-password
- **Auth:** Reset token in body
- **Body:** `{ "token": string, "password": string }`
- **Response (200):** `{ message: "Password has been reset successfully." }`
- **Errors:** 400 (invalid/expired token)

---

## User Profile & Addresses

### GET /api/users/me
- **Auth:** Required
- **Response (200):** `{ id, name, email, phone, role, gstin, isActive, emailVerified, createdAt }`

### PUT /api/users/me
- **Auth:** Required
- **Body:** `{ "name?": string, "phone?": string, "gstin?": string }`
- **Response (200):** Updated user object

### GET /api/users/me/addresses
- **Auth:** Required
- **Response (200):** `Address[]`

### POST /api/users/me/addresses
- **Auth:** Required
- **Body:** `{ "label": string, "line1": string, "line2?": string, "city": string, "state": string, "pincode": string, "isDefault?": boolean }`
- **Response (201):** Created address

### PUT /api/users/me/addresses/:id
- **Auth:** Required
- **Body:** Same as POST (partial updates)
- **Response (200):** Updated address
- **Errors:** 404 (not found or not owned)

### DELETE /api/users/me/addresses/:id
- **Auth:** Required
- **Response (200):** `{ message: "Address deleted." }`

---

## Categories

### GET /api/categories
- **Auth:** Public
- **Response (200):** Category tree with nested `children[]`
- **Shape:** `{ id, name, slug, parentId, imageUrl, children: Category[] }`

---

## Products

### GET /api/products
- **Auth:** Public
- **Query params:** `category` (slug), `q` (search), `minPrice`, `maxPrice`, `brand`, `sort` (price_asc|price_desc|name_asc|name_desc|newest), `page`, `limit`
- **Response (200):** Paginated product list
- **Product shape:**
```json
{
  "id": "uuid",
  "name": "MS Pipe Round AMK 40NB 2.0mm",
  "slug": "ms-pipe-round-amk-40nb-20mm",
  "brand": "AMK",
  "sku": "AMK-RND-40NB-2.0",
  "pricePerUnit": 245.50,
  "discountPrice": null,
  "baseUnit": "nos",
  "gstRate": 18,
  "specifications": { "dimensions": "40NB", "thicknessMm": 2.0, "weightKg": 8.5, "lengthM": 6 },
  "category": { "id": "...", "name": "MS Pipes - Round", "slug": "ms-pipes-round" },
  "images": [],
  "totalStock": 58,
  "inStock": true
}
```

### GET /api/products/:id
- **Auth:** Public
- **Response (200):** Full product with inventory details, reviews, price history
- **Additional fields:** `inventory[]` (per warehouse), `priceHistory[]`, `reviews[]`, `avgRating`, `reviewCount`

### GET /api/products/:id/reviews
- **Auth:** Public
- **Response (200):** `Review[]` with `{ id, rating, comment, createdAt, user: { id, name } }`

### POST /api/products/:id/reviews
- **Auth:** Required
- **Body:** `{ "rating": 1-5, "comment?": string }`
- **Response (201):** Created review
- **Errors:** 409 (already reviewed), 404 (product not found)

---

## Cart

### GET /api/cart
- **Auth:** Required
- **Response (200):** Cart with enriched items
- **Item shape:** `{ id, productId, productName, unitPrice, quantity, currentPrice, totalStock, inStock, image }`

### POST /api/cart/items
- **Auth:** Required
- **Body:** `{ "productId": string, "quantity": number }`
- **Response (201):** Created cart item (or 200 if quantity added to existing)
- **Errors:** 404 (product not found/inactive)

### PUT /api/cart/items/:itemId
- **Auth:** Required
- **Body:** `{ "quantity": number (≥1) }`
- **Response (200):** Updated cart item

### DELETE /api/cart/items/:itemId
- **Auth:** Required
- **Response (200):** `{ message: "Item removed from cart." }`

### DELETE /api/cart
- **Auth:** Required
- **Response (200):** `{ message: "Cart cleared." }`

---

## Orders

### POST /api/orders
- **Auth:** Required
- **Body:** `{ "addressId": string, "buyerGstin?": string, "notes?": string }`
- **Response (201):** Created order with items
- **Errors:** 409 (insufficient stock — returns `{ availableStock }` per item)
- **Note:** Atomically reserves stock in amk_catalog, then creates order in amk_auth. Compensation on failure.

### GET /api/orders
- **Auth:** Required
- **Query:** `page`, `limit`, `status`
- **Response (200):** Paginated own orders

### GET /api/orders/:id
- **Auth:** Required
- **Response (200):** Full order with items + tracking events
- **Order shape:**
```json
{
  "id": "uuid",
  "orderNumber": "AMK-20260711-A3F2B1",
  "status": "CONFIRMED",
  "paymentStatus": "PENDING",
  "items": [{ "productName": "...", "specs": {...}, "unitPrice": 245.50, "quantity": 5, "subtotal": 1227.50 }],
  "shippingAddress": { "label": "Office", "line1": "...", "city": "Trichy", ... },
  "subtotal": 1227.50,
  "gstAmount": 220.95,
  "totalAmount": 1448.45,
  "trackingEvents": [{ "status": "PENDING", "timestamp": "...", "note": null }],
  "createdAt": "..."
}
```

### GET /api/orders/:id/tracking
- **Auth:** Required
- **Response (200):**
```json
{
  "orderNumber": "AMK-20260711-A3F2B1",
  "currentStatus": "SHIPPED",
  "events": [
    { "status": "PENDING", "timestamp": "2026-07-11T10:00:00Z", "note": null, "location": null },
    { "status": "CONFIRMED", "timestamp": "2026-07-11T12:00:00Z", "note": "Order confirmed", "location": "Trichy" },
    { "status": "SHIPPED", "timestamp": "2026-07-12T08:00:00Z", "note": "Dispatched from warehouse", "location": "Trichy" }
  ]
}
```

### PUT /api/orders/:id/cancel
- **Auth:** Required (owner only)
- **Body:** `{ "reason?": string }`
- **Response (200):** Updated order (status = CANCELLED, paymentStatus = REFUNDED if was PAID)
- **Errors:** 400 (can only cancel PENDING/CONFIRMED), 403 (not owner)
- **Note:** Stock is automatically restored. Paid orders trigger automatic refund.

---

## OTP (Phone Verification)

> All OTP routes are rate-limited (15 requests/15 minutes). Optional auth: if a valid token is present, `excludeUserId` is accepted only when it matches the authenticated user's ID.

### POST /api/otp/send
- **Auth:** Public (optional auth for `excludeUserId`)
- **Body:** `{ "phone": string (10-digit Indian), "excludeUserId?": string }`
- **Response (200):** `{ message: "OTP sent to +91XXXXXXXXXX.", dev: boolean }`
- **Errors:** 400 (invalid phone), 409 (phone already registered), 429 (cooldown)

### POST /api/otp/verify
- **Auth:** Public
- **Body:** `{ "phone": string, "otp": string (6-digit) }`
- **Response (200):** `{ message: "Phone number verified successfully.", phoneVerificationToken: string }`
- **Errors:** 400 (invalid/expired OTP), 429 (max attempts)

### POST /api/otp/resend
- **Auth:** Public (optional auth for `excludeUserId`)
- **Body:** `{ "phone": string, "excludeUserId?": string }`
- **Response (200):** Same as `/otp/send`
- **Errors:** 409 (phone in use), 429 (cooldown)

### POST /api/otp/check-availability
- **Auth:** Public (optional auth for `excludeUserId`)
- **Body:** `{ "email?": string, "phone?": string, "excludeUserId?": string }`
- **Response (200):** `{ emailAvailable?: boolean, phoneAvailable?: boolean }`
- **Note:** `excludeUserId` is only honored when the request includes a valid auth token matching that user ID.

---

## Google Sign-In (Firebase)

### POST /api/auth/google
- **Auth:** Public
- **Body:** `{ "idToken": string (Firebase ID token), "recaptchaToken?": string }`
- **Response (200):** `{ user, accessToken, refreshToken }`
- **Note:** If the Google account's email matches an existing user, it links the accounts. Otherwise creates a new user. Users created via Google have no password hash.

---

## User Profile & Addresses

*(Continued from above)*

### PUT /api/users/me/password
- **Auth:** Required
- **Body:** `{ "currentPassword?": string, "newPassword": string }`
- **Response (200):** `{ message: "Password updated." }`
- **Note:** `currentPassword` is required if the user already has a password. Google-only users (no password) can set one without `currentPassword`.
- **Errors:** 401 (incorrect current password), 400 (validation)

---

## Wishlist

### GET /api/wishlist
- **Auth:** Required
- **Query:** `page` (default 1), `limit` (default 20, max 50)
- **Response (200):** Paginated wishlist items with product details from catalog

### POST /api/wishlist
- **Auth:** Required
- **Body:** `{ "productId": string }`
- **Response (201):** Created wishlist item

### DELETE /api/wishlist/:productId
- **Auth:** Required
- **Response (200):** `{ message: "Removed from wishlist." }`

---

## Payments (Razorpay)

### POST /api/payments/create-order
- **Auth:** Required
- **Body:** `{ "orderId": string }`
- **Response (200):** `{ razorpayOrderId, amount (paise), currency: "INR", keyId }`

### POST /api/payments/verify
- **Auth:** Required (owner only — must own the order being verified)
- **Body:** `{ "razorpay_order_id": string, "razorpay_payment_id": string, "razorpay_signature": string, "orderId?": string }`
- **Response (200):** Updated order with `paymentStatus: "PAID"`
- **Errors:** 400 (invalid signature), 403 (not order owner), 404 (order not found)

---

## Admin Routes

> All admin routes require `Authorization: Bearer <token>` with `role = ADMIN`. Non-admin tokens get 403.

### GET /api/admin/dashboard
- **Response (200):** `{ totalOrders, ordersByStatus, totalUsers, totalProducts, totalRevenue, recentOrders[], lowStockAlerts[] }`

### GET /api/admin/orders
- **Query:** `page`, `limit`, `status`, `from`, `to`
- **Response (200):** Paginated orders with user details

### PUT /api/admin/orders/:id/status
- **Body:** `{ "status": OrderStatus, "note?": string, "location?": string }`
- **Response (200):** Updated order with auto-created tracking event
- **Status transitions enforced:**
  - `PENDING` → `CONFIRMED` or `CANCELLED`
  - `CONFIRMED` → `PROCESSING` or `CANCELLED`
  - `PROCESSING` → `SHIPPED` or `CANCELLED`
  - `SHIPPED` → `OUT_FOR_DELIVERY`
  - `OUT_FOR_DELIVERY` → `DELIVERED`
  - `DELIVERED` → `RETURNED`
  - `CANCELLED`, `RETURNED` → (terminal, no transitions)
- **Errors:** 400 (invalid status transition), 404 (order not found)

### POST /api/admin/products
- **Body:** Full product data (name, categoryId, sku, pricePerUnit, specifications, etc.)
- **Response (201):** Created product

### PUT /api/admin/products/:id
- **Body:** Partial product update
- **Response (200):** Updated product (+ price history entry if price changed)

### DELETE /api/admin/products/:id
- **Response (200):** Soft-deleted (isActive = false)

### POST /api/admin/products/import
- **Body:** `{ "products": Product[] }`
- **Response (200):** `{ created, updated, errors[] }`
- **Note:** Each product in the array is validated against the product schema before upserting.

### POST /api/admin/categories
- **Body:** `{ "name": string, "slug": string, "parentId?": string, "imageUrl?": string }`
- **Response (201):** Created category

### GET /api/admin/inventory
- **Query:** `page`, `limit`, `lowStock`, `warehouseId`
- **Response (200):** Paginated inventory with product and warehouse details

### PUT /api/admin/inventory/:productId
- **Body:** `{ "quantityAvailable?": number, "quantityReserved?": number, "reorderLevel?": number }`
- **Response (200):** Updated inventory record

### GET /api/admin/users
- **Query:** `page`, `limit`, `role`, `q`
- **Response (200):** Paginated users

### PUT /api/admin/users/:id/role
- **Body:** `{ "role": "CUSTOMER" | "STAFF" | "ADMIN" }`
- **Response (200):** Updated user
- **Guards:**
  - Cannot change your own role (400)
  - Cannot demote the last remaining admin (400)

---

## Enums

### OrderStatus
`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `OUT_FOR_DELIVERY` → `DELIVERED`
Side branches: `CANCELLED`, `RETURNED`

### PaymentStatus
`PENDING`, `PAID`, `FAILED`, `REFUNDED`

### Role
`CUSTOMER`, `ADMIN`, `STAFF`

---

## Notes

- **Courier integration:** v1 uses internal admin-updated tracking. Shiprocket/Delhivery integration could later auto-generate TrackingEvent rows.
- **Email:** Password reset emails sent via Resend (3k/month free tier).
- **Images:** No product images imported yet. Admin can upload via product CRUD endpoints (Cloudinary integration ready but not seeded).
- **Data:** 273 real products from Trichy warehouse. Zero CBE/Coimbatore records.
- **OTP:** v1 uses in-memory OTP store. For production, migrate to Redis or database-backed store.
- **reCAPTCHA:** v3 verification on auth endpoints. Frontend passes `recaptchaToken` in request body; backend verifies via Google's API.
