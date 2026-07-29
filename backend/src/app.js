/**
 * Express application setup.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const otpRoutes = require('./routes/otp.routes');

const app = express();

// ── Security ────────────────────────────────────────────────────────────
app.use(helmet());

// CORS — restricted to allowed origins
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
// Also allow Capacitor app origin (http, https, and capacitor schemes)
allowedOrigins.push('capacitor://localhost', 'http://localhost', 'https://localhost');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// ── Body parsing ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting (general) ─────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Health check ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── API Routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/otp', otpRoutes);

// ── 404 handler ─────────────────────────────────────────────────────────
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found.` },
  });
});

// ── Global error handler ────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
