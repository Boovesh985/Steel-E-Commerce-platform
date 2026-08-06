# AMK Steels Marketplace — Complete Technical Documentation & System Reference

---

## 1. Project Overview & Architecture Summary

**AMK Steels Marketplace** is a full-stack, enterprise-grade e-commerce application designed for industrial steel procurement and logistics tracking. It supports multi-channel access via a high-performance **Web Application** (deployed on Vercel) and a **Native Android Application** built using Capacitor 8 (distributed via signed APK).

The system integrates real-world steel catalog data (Trichy warehouse inventory) featuring products from **AMK** and **Apollo (APL)** across three primary pipe geometric profiles: **Round**, **Square**, and **Rectangular**.

```
                           ┌─────────────────────────────────────────┐
                           │          Clients & Interfaces           │
                           ├──────────────────┬──────────────────────┤
                           │  React 19 Web    │ Native Android (APK) │
                           │   (Vercel Host)  │ (Capacitor 8 Engine) │
                           └────────┬─────────┴──────────┬───────────┘
                                    │                    │
                                    └──────────┬─────────┘
                                               │ HTTPS / REST API
                                               ▼
                           ┌─────────────────────────────────────────┐
                           │        Node.js Express Backend          │
                           │           (Render Cloud Host)           │
                           ├─────────────────────────────────────────┤
                           │ • JWT & Native Google OAuth Authentication│
                           │ • Zod Schema Validation & Middleware     │
                           │ • Express Rate Limiting & Helmet Security │
                           │ • Cross-DB Distributed Transactions      │
                           └────────┬────────────────────┬───────────┘
                                    │                    │
               Prisma Client (Auth) │                    │ Prisma Client (Catalog)
                                    ▼                    ▼
                           ┌──────────────────┐ ┌──────────────────┐
                           │   amk_auth DB    │ │  amk_catalog DB  │
                           │ (Neon Postgres)  │ │ (Neon Postgres)  │
                           └──────────────────┘ └──────────────────┘
```

---

## 2. Technology Stack & Frameworks

### 2.1 Frontend Stack (Web & Mobile Engine)
* **Core Framework**: React 19 (Hooks, Context, Functional Components)
* **Build Engine & Bundler**: Vite 6 (`@vitejs/plugin-react`)
* **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React Icon Library (`lucide-react`), Framer Motion
* **State Management**: Zustand v5 (Persisted Auth Store, Cart Store, Toast Store)
* **Data Fetching & Caching**: TanStack React Query v5 (`@tanstack/react-query`)
* **HTTP Client**: Axios v1.7 (Custom interceptors for Bearer token insertion, automatic JWT silent refresh, and global error handling)
* **Routing**: React Router v7 (`react-router-dom`)
* **Payment Gateway Integration**: Razorpay Checkout SDK (`window.Razorpay`)

### 2.2 Android Native Stack
* **Native Runtime Container**: Capacitor 8 Engine (`@capacitor/core`, `@capacitor/android`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/haptics`, `@capacitor/splash-screen`)
* **Native Authentication**: `@codetrix-studio/capacitor-google-auth` (Native Google Account Picker & ID Token exchange)
* **Build Toolchain**: Android SDK, Gradle 8.14, JDK 21 (Microsoft OpenJDK `jdk-21.0.11.10-hotspot`)
* **Artifact**: Release Signed Standalone Android Package (`AMK-Steels-v1.1.apk`)

### 2.3 Backend Stack
* **Runtime**: Node.js (v20+ LTS)
* **Web Framework**: Express v5 (`express`)
* **Database ORM**: Prisma ORM v6 (`@prisma/client`) with dual client instances (`authPrisma` and `catalogPrisma`)
* **Database Infrastructure**: Serverless PostgreSQL via **Neon Cloud**
* **Security & Auth**:
  * `jsonwebtoken` (Access & Refresh JWT Token pairs)
  * `argon2` / `bcryptjs` (Password hashing)
  * `firebase-admin` (Firebase Service Account authentication for Google Tokens)
  * `helmet` (HTTP Security Headers)
  * `express-rate-limit` (IP Rate Limiting with `trust proxy` enabled for Render)
  * Google reCAPTCHA v3 Verification Middleware
* **Validation**: Zod v4 Schema Validation (`zod`)
* **Communication & Services**:
  * **Resend API** (`resend`) for Password Reset Emails
  * **Fast2SMS API** for SMS notifications / OTPs
  * **Cloudinary SDK** for Product Asset Uploads
  * **Razorpay Node SDK** for Webhook & Payment Verification Signature validation (`crypto.HmacSHA256`)

---

## 3. Database Architecture (Dual Database Model)

To guarantee high scalability and domain separation, the database is partitioned into two isolated Neon PostgreSQL instances: **`amk_auth`** and **`amk_catalog`**.

### 3.1 `amk_auth` Database Schema
Manages user accounts, authentication tokens, cart state, order history, shipping addresses, wishlist items, and reviews.

```prisma
enum Role {
  CUSTOMER
  ADMIN
  STAFF
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  RETURNED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

model User {
  id            String         @id @default(uuid())
  name          String
  email         String         @unique
  phone         String?        @unique
  passwordHash  String?
  role          Role           @default(CUSTOMER)
  gstin         String?
  isActive      Boolean        @default(true)
  emailVerified Boolean        @default(false)
  phoneVerified Boolean        @default(false)
  googleId      String?        @unique
  avatarUrl     String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  addresses     Address[]
  cart          Cart?
  orders        Order[]
  reviews       Review[]
  wishlist      WishlistItem[]
  refreshTokens RefreshToken[]
}

model Address {
  id        String  @id @default(uuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String
  line1     String
  line2     String?
  city      String
  state     String
  pincode   String
  isDefault Boolean @default(false)
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([tokenHash])
  @@index([userId])
}

model Cart {
  id        String     @id @default(uuid())
  userId    String     @unique
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]
  updatedAt DateTime   @updatedAt
}

model CartItem {
  id          String  @id @default(uuid())
  cartId      String
  cart        Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId   String
  productName String
  unitPrice   Decimal
  quantity    Int
}

model Order {
  id              String          @id @default(uuid())
  orderNumber     String          @unique
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  items           OrderItem[]
  trackingEvents  TrackingEvent[]
  shippingAddress Json
  buyerGstin      String?
  subtotal        Decimal
  gstAmount       Decimal
  totalAmount     Decimal
  status          OrderStatus     @default(PENDING)
  paymentStatus   PaymentStatus   @default(PENDING)
  paymentId       String?
  razorpayOrderId String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model OrderItem {
  id          String  @id @default(uuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  productName String
  specs       Json
  unitPrice   Decimal
  quantity    Int
  subtotal    Decimal
}

model TrackingEvent {
  id        String      @id @default(uuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status    OrderStatus
  note      String?
  location  String?
  timestamp DateTime    @default(now())
}

model Review {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}

model WishlistItem {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}
```

### 3.2 `amk_catalog` Database Schema
Manages categories, product master data, pricing tiers, warehouses, and real-time inventory balances.

```prisma
model Category {
  id       String     @id @default(uuid())
  name     String
  slug     String     @unique
  parentId String?
  parent   Category?  @relation("SubCategories", fields: [parentId], references: [id])
  children Category[] @relation("SubCategories")
  imageUrl String?
  products Product[]
}

model Product {
  id             String         @id @default(uuid())
  categoryId     String
  category       Category       @relation(fields: [categoryId], references: [id])
  name           String
  slug           String         @unique
  brand          String?
  sku            String         @unique
  hsnCode        String?
  gstRate        Decimal        @default(18)
  description    String?
  baseUnit       String
  pricePerUnit   Decimal
  discountPrice  Decimal?
  minOrderQty    Int            @default(1)
  specifications Json
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  images       ProductImage[]
  inventory    Inventory[]
  priceHistory PriceHistory[]
}

model ProductImage {
  id           String  @id @default(uuid())
  productId    String
  product      Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url          String
  displayOrder Int     @default(0)
}

model Warehouse {
  id        String      @id @default(uuid())
  name      String
  city      String
  state     String
  pincode   String
  phone     String?
  inventory Inventory[]
}

model Inventory {
  id                String    @id @default(uuid())
  productId         String
  product           Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouseId       String
  warehouse         Warehouse @relation(fields: [warehouseId], references: [id])
  quantityAvailable Int       @default(0)
  quantityReserved  Int       @default(0)
  reorderLevel      Int       @default(10)
  updatedAt         DateTime  @updatedAt

  @@unique([productId, warehouseId])
}

model PriceHistory {
  id            String   @id @default(uuid())
  productId     String
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  price         Decimal
  effectiveFrom DateTime @default(now())
}
```

---

## 4. Backend Architecture & API Specification

All backend endpoints reside behind Express routes governed by custom Zod validation middleware and authentication guards.

### 4.1 Route Table

| Module | HTTP Method | Endpoint Path | Access Level | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Public | Register new customer account |
| **Auth** | `POST` | `/api/auth/login` | Public | Email & Password authentication |
| **Auth** | `POST` | `/api/auth/google` | Public | Native / Web Google OAuth Token exchange |
| **Auth** | `POST` | `/api/auth/refresh` | Public | Generate fresh Access Token using Refresh Token |
| **Auth** | `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token and logout |
| **Auth** | `POST` | `/api/auth/forgot-password` | Public | Trigger password reset email via Resend API |
| **Auth** | `POST` | `/api/auth/reset-password` | Public | Verify reset token and set new password |
| **User** | `GET` | `/api/users/me` | Authenticated | Fetch current logged-in user profile |
| **User** | `PUT` | `/api/users/me` | Authenticated | Update profile details (Name, Phone, GSTIN) |
| **User** | `PUT` | `/api/users/me/password` | Authenticated | Change password |
| **User** | `GET` | `/api/users/me/addresses` | Authenticated | List all shipping addresses |
| **User** | `POST` | `/api/users/me/addresses` | Authenticated | Create a new shipping address |
| **User** | `PUT` | `/api/users/me/addresses/:id` | Authenticated | Update existing shipping address |
| **User** | `DELETE` | `/api/users/me/addresses/:id` | Authenticated | Delete a shipping address |
| **Products** | `GET` | `/api/products` | Public | Search, filter, and paginate catalog products |
| **Products** | `GET` | `/api/products/:id` | Public | Fetch product detail by ID or Slug |
| **Products** | `GET` | `/api/products/:id/reviews` | Public | List reviews for a product |
| **Products** | `POST` | `/api/products/:id/reviews` | Authenticated | Submit product review & rating |
| **Categories**| `GET` | `/api/categories` | Public | Fetch category tree structure |
| **Cart** | `GET` | `/api/cart` | Authenticated | Fetch user cart items and subtotal |
| **Cart** | `POST` | `/api/cart/items` | Authenticated | Add item to cart |
| **Cart** | `PUT` | `/api/cart/items/:itemId` | Authenticated | Update item quantity |
| **Cart** | `DELETE` | `/api/cart/items/:itemId` | Authenticated | Remove item from cart |
| **Cart** | `DELETE` | `/api/cart` | Authenticated | Empty user cart |
| **Orders** | `POST` | `/api/orders` | Authenticated | Execute checkout and stock reservation |
| **Orders** | `GET` | `/api/orders` | Authenticated | List customer order history |
| **Orders** | `GET` | `/api/orders/:id` | Authenticated | Get detailed order summary |
| **Orders** | `GET` | `/api/orders/:id/tracking` | Authenticated | Get real-time order tracking timeline |
| **Orders** | `PUT` | `/api/orders/:id/cancel` | Authenticated | Cancel pending order & restore stock |
| **Payments** | `POST` | `/api/payments/create-order` | Authenticated | Initialize Razorpay order payload |
| **Payments** | `POST` | `/api/payments/verify` | Authenticated | Verify Razorpay HMAC signature |
| **Wishlist** | `GET` | `/api/wishlist` | Authenticated | List user wishlist items |
| **Wishlist** | `POST` | `/api/wishlist` | Authenticated | Add product to wishlist |
| **Wishlist** | `DELETE` | `/api/wishlist/:productId` | Authenticated | Remove product from wishlist |
| **Admin** | `GET` | `/api/admin/dashboard` | Admin Only | Analytics dashboard stats |
| **Admin** | `POST` | `/api/admin/products` | Admin Only | Create catalog product |
| **Admin** | `PUT` | `/api/admin/products/:id` | Admin Only | Edit catalog product |
| **Admin** | `DELETE` | `/api/admin/products/:id` | Admin Only | Soft/Hard delete product |
| **Admin** | `GET` | `/api/admin/orders` | Admin Only | Manage all platform orders |
| **Admin** | `PUT` | `/api/admin/orders/:id/status`| Admin Only | Update order fulfillment status |
| **Admin** | `GET` | `/api/admin/inventory` | Admin Only | View warehouse inventory levels |
| **Admin** | `PUT` | `/api/admin/inventory/:productId`| Admin Only | Adjust warehouse stock levels |
| **Admin** | `GET` | `/api/admin/users` | Admin Only | Manage system users & roles |
| **Admin** | `PUT` | `/api/admin/users/:id/role` | Admin Only | Update user role (CUSTOMER/STAFF/ADMIN) |

---

## 5. Security & Authentication Engineering

1. **JWT Architecture**:
   * **Access Token**: Short-lived (15 minutes), signed with `JWT_ACCESS_SECRET`. Passed in HTTP Authorization Header as `Bearer <token>`.
   * **Refresh Token**: Long-lived (30 days), hashed with SHA-256 and stored in `RefreshToken` database table. Allows seamless token renewal.

2. **Google OAuth & Native Android Google Auth**:
   * **Web**: Firebase Authentication `signInWithPopup` configured with `prompt: 'select_account'` to prevent auto-selecting sticky sessions.
   * **Android App**: Powered by `@codetrix-studio/capacitor-google-auth`. Opens native Google Account Picker → retrieves Google ID token → exchanges for Firebase Credential via `signInWithCredential` → backend verifies Firebase ID token via `firebase-admin`. `GoogleAuth.signOut()` is executed before every sign-in attempt to guarantee account selection prompt without crashing native WebView wrappers.

3. **Rate Limiting & Proxy Configuration**:
   * Rate limiting is configured using `express-rate-limit`.
   * Node Express app sets `app.set('trust proxy', 1)` to trust Render's reverse proxy, preventing `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` errors and accurately capturing client IPs.

4. **Bot & Abuse Prevention**:
   * Enterprise reCAPTCHA v3 verification middleware checks high-risk actions (`register`, `login`, `google_auth`, `forgot_password`).

---

## 6. Frontend Architecture & Design System

### 6.1 Principles & State Flow
* **Zustand Persistence**: `authStore` persists JWT tokens and user profile to `localStorage` with automated state rehydration protection (`isHydrated` check prevents flicker redirects).
* **React Query Mutation Logic**: Server state synchronization is managed via `useQuery` and `useMutation` with automated invalidation tags (`['cart']`, `['orders']`, `['products']`).
* **Optimistic Quantity Controls**: Quantity selectors on product detail and cart pages feature dual controls (`+`, `-` buttons alongside an editable `<input type="number">`). Supports auto-select on focus (`onFocus={(e) => e.target.select()}`), empty-state entry during typing, and strict fallback validation on `onBlur` against minimum order quantities.

### 6.2 Admin Control Panel
The `/admin` portal features dedicated management interfaces for:
* **Analytics Dashboard**: Live revenue, order velocity, inventory metrics, and top-selling pipe grades.
* **Product Catalog Editor**: Dynamic specification builder and category assigner.
* **Inventory Management**: Real-time stock adjustment by warehouse location.
* **Order Logistics Fulfillment**: Step-by-step order tracking state updates (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPED` → `DELIVERED`).
* **User & Role Administration**: Role elevation and account status controls.

---

## 7. Android App Engineering & Capacitor Integration

The Android mobile app is packaged as a high-performance native hybrid application.

### 7.1 Capacitor Configuration (`capacitor.config.json`)
```json
{
  "appId": "com.amksteels.app",
  "appName": "AMK Steels",
  "webDir": "dist",
  "bundledWebRuntime": false,
  "server": {
    "androidScheme": "https",
    "cleartext": true
  },
  "plugins": {
    "GoogleAuth": {
      "scopes": ["profile", "email"],
      "serverClientId": "your-google-client-id.apps.googleusercontent.com",
      "forceCodeForRefreshToken": true
    },
    "StatusBar": {
      "overlaysWebView": false,
      "style": "LIGHT",
      "backgroundColor": "#FFFFFF"
    }
  }
}
```

### 7.2 Native Adaptations & UX Fixes
1. **Status Bar Visibility**: Configured with `StatusBar.setStyle({ style: Style.Light })` (dark icons) and `#FFFFFF` background, disabling webview overlay (`overlaysWebView: false`) to avoid Android notch and status bar overlaps.
2. **Android Hardware Back Button**: Wired into React root via `@capacitor/app` listener. Navigates back in browser history if possible, or cleanly exits app when triggered on root page (`/`).
3. **Vite Dynamic Relative Assets**: Web build uses Vite base configuration `process.env.VITE_BASE || '/'`, which forces relative resolution (`./`) during mobile builds so assets correctly load from Android `assets/public/` file paths.

---

## 8. Distributed Cross-Database Transaction Engine

Because the system splits authentication data (`amk_auth`) and catalog inventory (`amk_catalog`) across two serverless PostgreSQL databases, traditional single-database SQL transactions cannot span both. 

A **Two-Phase Atomic Stock Reservation Algorithm with Compensating Transactions** is implemented in `checkout.service.js`:

```
           [ Client Checkout Request ]
                       │
                       ▼
       ┌───────────────────────────────┐
       │ 1. Validate User & Addresses  │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │ 2. Read Catalog & Stock Info  │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │ 3. PHASE 1: Reserve Stock     │
       │    Conditional SQL Update in  │
       │          amk_catalog          │
       │ quantityAvailable >= req      │
       └───────────────┬───────────────┘
                       │
            ┌──────────┴──────────┐
            │ Success             │ Failure / Race Condition
            ▼                     ▼
┌───────────────────────┐ ┌───────────────────────────┐
│ 4. PHASE 2: Create    │ │ Compensate & Restore      │
│    Order in amk_auth  │ │ Previously Reserved Stock │
└───────────┬───────────┘ └─────────────┬─────────────┘
            │                           │
   ┌────────┴────────┐                  ▼
   │ Success         │ Failure   [ Throw Error ]
   ▼                 ▼
[ Return Order ] ┌───────────────────────────┐
                 │ Execute Stock            │
                 │ Compensation Transaction │
                 └───────────┬───────────────┘
                             │
                             ▼
                      [ Throw Error ]
```

### Stock Reservation Logic implementation:
```javascript
// Step 1: Atomic conditional update in amk_catalog
const result = await catalogPrisma.inventory.updateMany({
  where: {
    id: inv.id,
    quantityAvailable: { gte: decrementQty },
  },
  data: {
    quantityAvailable: { decrement: decrementQty },
    quantityReserved: { increment: decrementQty },
  },
});

if (result.count === 0) {
  // Stock condition failed due to race condition → trigger compensation
  await compensateReservations(reservedInventoryIds);
  throw new AppError(409, 'INSUFFICIENT_STOCK', 'Stock just purchased by another buyer.');
}

// Step 2: Attempt Order Creation in amk_auth
try {
  order = await authPrisma.order.create({ ... });
} catch (err) {
  // If order creation fails, trigger compensating transaction to restore catalog stock
  await compensateReservations(reservedInventoryIds);
  throw err;
}
```

---

## 9. Deployment Infrastructure & Environment Variables

### 9.1 Infrastructure Layout
* **Web Hosting**: **Vercel** (`amk-steels.vercel.app`) with SPA rewrite rules (`vercel.json`).
* **Backend API**: **Render** (`amk-steels-api.onrender.com`) running Node.js runtime.
* **Databases**: **Neon Serverless PostgreSQL** (DB instances in AWS `ap-southeast-1`).
* **Mobile Artifact**: Signed Android Package `AMK-Steels-v1.1.apk`.

### 9.2 Environment Configuration Table

#### Backend `.env` Variable Schema
| Key Name | Description / Target | Example Value |
|---|---|---|
| `AUTH_DATABASE_URL` | Neon Connection String (`amk_auth`) | `postgresql://user:pass@ep-auth.neon.tech/amk_auth?sslmode=require` |
| `CATALOG_DATABASE_URL` | Neon Connection String (`amk_catalog`) | `postgresql://user:pass@ep-cat.neon.tech/amk_catalog?sslmode=require` |
| `JWT_ACCESS_SECRET` | 256-bit Random Secret | `a1c7f9e3b4d608...` |
| `JWT_REFRESH_SECRET` | 256-bit Random Secret | `e8d6c4b2a0f7e5...` |
| `FRONTEND_URL` | Deployed Frontend Domain | `https://amk-steels.vercel.app` |
| `CORS_ORIGIN` | Allowed HTTP CORS Origin | `https://amk-steels.vercel.app` |
| `RAZORPAY_KEY_ID` | Razorpay Merchant API Key | `rzp_test_xxxxxxxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Merchant Secret | `your-razorpay-secret` |
| `RESEND_API_KEY` | Transactional Email API Key | `re_xxxxxxxxxxxx...` |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA Secret Key | `6Lxxxxxxxxxxxxxxxxxxxxxxxxxx...` |
| `FAST2SMS_API_KEY` | SMS Provider API Key | `your-fast2sms-api-key...` |

---

## 10. Summary of Release Deliverables

* **Production Web App**: `https://amk-steels.vercel.app`
* **Production API Service**: `https://amk-steels-api.onrender.com`
* **Android Release APK**: `AMK-Steels-v1.1.apk` (16.7 MB)
* **Master Source Repository**: `Boovesh985/amk-steels` (`master` branch)
* **Imported Inventory**: 273 Real-world Steel Pipe Products from Trichy Stock Summary with automated shape-detected images.

---
*Documentation Generated & Verified for AMK Steels Release Build.*
