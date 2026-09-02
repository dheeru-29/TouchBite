import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5000;

// The admin dashboard is served BY this backend at /admin, so its requests
// are same-origin — but Chrome still sends an Origin header on same-origin
// POST/PATCH requests, so the server's own origin has to be explicitly
// allowed too, regardless of what CLIENT_ORIGIN (meant for the kiosk, which
// runs on a different port) is set to.
const selfOrigins = [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  'https://touchbite.onrender.com',
];
const defaultClientOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://0.0.0.0:5173'];
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const allowedOrigins = [...new Set([...defaultClientOrigins, ...configuredOrigins, ...selfOrigins])];

const app = express();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

app.use('/api/auth', authRoutes);
app.use('/api', menuRoutes);
app.use('/api/orders', orderRoutes);

// Merchant dashboard: a plain static page served directly by this backend at
// /admin. It is NOT part of the customer kiosk's Vite build — nothing in
// touchbite/src links to it, ships it, or bundles it. Reaching /admin gets
// you a login screen; the actual order data behind it is still gated by
// requireAdmin on every API call (see routes/orderRoutes.js), so knowing the
// URL alone gets an attacker nothing.
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

app.use(notFound);
app.use(errorHandler);
export default app;
