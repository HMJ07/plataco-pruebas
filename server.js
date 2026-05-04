// ============================================================
// PLATACO — Backend Node.js + Express
// ============================================================
// Instalación:
//   npm install express pg bcryptjs jsonwebtoken stripe
//               dotenv cors helmet morgan express-validator
// ============================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes     from './auth.js';
import productRoutes  from './products.js';
import orderRoutes    from './orders.js';
import paymentRoutes  from './payments.js';
import adminRoutes    from './admin.js';
import webhookRoutes  from './webhooks.js';

dotenv.config();

const app = express();

// ── Seguridad y middlewares globales ───────────────────────
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow tools like local static file preview (`Origin: null`) during development.
    if (!origin || origin === 'null') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin no permitido por CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(morgan('dev'));

// El webhook de Stripe necesita el body en crudo (raw)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// El resto de rutas usan JSON
app.use(express.json());

// ── Rutas ──────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/webhooks', webhookRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config', (req, res) => {
  res.json({
    stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || null,
  });
});

// ── Manejador de errores global ────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor PLATACO corriendo en http://localhost:${PORT}`);
});

export default app;
