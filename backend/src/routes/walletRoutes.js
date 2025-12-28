const express = require('express');
const { verifyToken } = require('../middleware/auth');
const walletController = require('../controllers/walletController');

const router = express.Router();

router.use(verifyToken);

router.get('/', walletController.getBalance);
router.get('/history', walletController.getHistory);

module.exports = router;
