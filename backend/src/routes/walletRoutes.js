const express = require('express');
const cors = require('cors');
const { verifyToken } = require('../middleware/auth');
const walletController = require('../controllers/walletController');

const router = express.Router();

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
const corsOptions = {
  origin: (origin, callback) => {
    const isAllowed = !origin || origins.includes(origin);
    return isAllowed ? callback(null, true) : callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  optionsSuccessStatus: 200
};

router.options('*', cors(corsOptions));
router.use(cors(corsOptions));
router.use(verifyToken);

router.get('/', walletController.getBalance);
router.get('/history', walletController.getHistory);
router.post('/transfer', walletController.transferToMain);

module.exports = router;
