# 🏗️ AMK Steels — E-Commerce Platform

A production-grade **B2C/B2B e-commerce marketplace** for industrial steel products (TMT bars, structural steel, pipes, sheets, coils, angles, channels, wire products). Ships as both a **responsive website** and a **signed Android APK** from a single React codebase.

## 🏛️ Architecture

```
┌─────────────────────────────────────────────┐
│            Frontend (React SPA)             │
│   Vite + React + TailwindCSS + Zustand      │
│   Deploys: Vercel (web) + Capacitor (APK)   │
└──────────────────┬──────────────────────────┘
                   │ REST API (Bearer JWT)
┌──────────────────┴──────────────────────────┐
│          Backend (Node.js + Express)         │
│  Dual Prisma Clients · Razorpay · Resend    │
│            Deploys: Render                   │
└─────┬───────────────────────────┬───────────┘
      │                           │
┌─────┴─────┐             ┌──────┴──────┐
│ amk_auth  │             │ amk_catalog │
│ PostgreSQL│             │ PostgreSQL  │
│ (Neon)    │             │ (Neon)      │
└───────────┘             └─────────────┘
```

### Key Design Decisions
- **Dual isolated databases** — `amk_auth` (users, orders, cart) and `amk_catalog` (products, inventory, warehouses) with separate Prisma clients
- **Cross-database checkout** — Compensating transaction pattern for atomic stock reservation across databases
- **No cookies** — Pure `Authorization: Bearer <token>` JWT auth with refresh token rotation
- **Argon2id** password hashing with transparent bcrypt migration
- **Single codebase** — One React app for web + Android (Capacitor)

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TailwindCSS v4, Zustand, React Query, React Router v7 |
| **Backend** | Node.js, Express 5, Prisma ORM (dual clients), Zod validation |
| **Database** | PostgreSQL (Neon Serverless) — 2 isolated databases |
| **Auth** | JWT (access + refresh), Google Sign-In (Firebase), Phone OTP (Firebase) |
| **Payments** | Razorpay (HMAC-verified) |
| **Email** | Resend (transactional emails, billing receipts) |
| **Mobile** | Capacitor (Android APK) |
| **Security** | Helmet, CORS, reCAPTCHA v3, rate limiting, Argon2id |
| **Deploy** | Vercel (frontend), Render (backend), Neon (databases) |

## 📦 Project Structure

```
├── backend/
│   ├── prisma/           # Dual Prisma schemas (auth + catalog)
│   ├── scripts/          # Seed, import, and setup scripts
│   ├── src/
│   │   ├── config/       # Database, env, Firebase Admin
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/    # Auth, validation, rate limiting, reCAPTCHA
│   │   ├── routes/       # Express routes
│   │   ├── schemas/      # Zod validation schemas
│   │   └── services/     # Auth, checkout, email, payment
│   └── .env.example      # Environment variable template
├── frontend/
│   ├── android/          # Capacitor Android project
│   ├── src/
│   │   ├── api/          # Axios API client + endpoint modules
│   │   ├── components/   # Reusable UI components
│   │   ├── config/       # Firebase web config
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Route pages (customer + admin)
│   │   ├── stores/       # Zustand state stores
│   │   └── utils/        # Google Auth, product helpers
│   └── .env.example      # Frontend env variable template
├── docker-compose.yml    # Local dev environment
└── PROJECT_DOCUMENTATION.md  # Full technical documentation
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (or use Docker)

### 1. Clone & Install
```bash
git clone https://github.com/Boovesh985/amk-steels.git
cd amk-steels
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your database URLs, JWT secrets, Razorpay keys, etc.

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your API URL, Firebase config, etc.
```

### 3. Database Setup
```bash
# Option A: Docker (recommended for local dev)
docker-compose up -d postgres

# Option B: Manual PostgreSQL setup
psql -f backend/scripts/init-db.sql
```

### 4. Generate Prisma & Seed
```bash
cd backend
npm run setup   # Generates Prisma clients, pushes schema, seeds admin + products
```

### 5. Run
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open http://localhost:5173

### 6. Build Android APK
```bash
cd frontend
VITE_BASE="./" npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
```

## 📚 Documentation

See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for comprehensive technical documentation covering:
- Database schema design (dual-database architecture)
- API endpoint reference (all routes, auth, admin)
- Cross-database checkout algorithm
- Payment flow (Razorpay integration)
- Deployment infrastructure

## 📄 License

This project is proprietary software. All rights reserved.
