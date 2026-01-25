const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const { db } = require('./config/firebase');

// Middleware
app.use(helmet());
const originsEnv = process.env.CORS_ALLOWED_ORIGINS;
const defaultOrigins = [
  'https://osghub.com',
  'https://www.osghub.com',
  'https://osghubvtu.onrender.com',
  'https://osghubadminpanel.onrender.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001'
];
const envOrigins = originsEnv ? originsEnv.split(',').map(s => s.trim()).filter(Boolean) : [];
const origins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
const corsOptions = {
  origin: (origin, callback) => {
    let isAllowed = !origin || origins.includes(origin);
    if (!isAllowed && origin) {
      try {
        const host = new URL(origin).hostname.toLowerCase();
        // Allow any subdomain of osghub.com
        if (host === 'osghub.com' || host.endsWith('.osghub.com')) {
          isAllowed = true;
        }
      } catch {}
    }
    if (!isAllowed) {
      console.log(`[CORS] Blocked origin: ${origin}`);
      console.log(`[CORS] Allowed origins: ${origins.join(', ')}`);
    }
    return isAllowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Do not pin allowed headers; let cors echo Access-Control-Request-Headers
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Ensure preflight requests are handled early with the same options
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.status(200).json({ message: 'OSGHUB VTU Backend is running' });
});
// Public Plans endpoint for user frontend
app.get('/api/plans', async (_req, res) => {
  try {
    if (!db) return res.json([]);
    const snap = await db.collection('service_plans').orderBy('createdAt', 'desc').get();
    const rows = snap.docs.map(d => {
      const x = d.data() || {};
      return {
        id: d.id,
        network: x.network || '',
        name: x.name || '',
        priceUser: Number(x.priceUser || x.price_user || 0),
        priceApi: Number(x.priceApi || x.price_api || 0),
        type: x.type || null,
        active: x.active !== false,
        metadata: x.metadata || null,
        createdAt: x.createdAt || new Date(),
      };
    }).filter(r => r.active);
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

// Import Routes
const walletRoutes = require('./routes/walletRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

module.exports = app;
