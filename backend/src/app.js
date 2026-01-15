const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
const originsEnv = process.env.CORS_ALLOWED_ORIGINS;
const origins = originsEnv ? originsEnv.split(',').map(s => s.trim()).filter(Boolean) : [
  'https://osghub.com',
  'https://www.osghub.com',
  'https://osghubvtu.onrender.com',
  'https://osghubadminpanel.onrender.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001'
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests without origin (e.g., mobile apps, curl) and from known origins
    const isAllowed = !origin || origins.includes(origin);
    
    if (!isAllowed) {
      console.log(`[CORS] Blocked origin: ${origin}`);
      console.log(`[CORS] Allowed origins: ${origins.join(', ')}`);
    }

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Email'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
}));
// Ensure preflight requests are handled early
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.status(200).json({ message: 'OSGHUB VTU Backend is running' });
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
