const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(verifyToken);
router.use(isAdmin);

router.post('/settings', adminController.updateSettings);
router.get('/settings', adminController.getSettings);
router.get('/transactions', adminController.getAllTransactions);
router.post('/wallet/credit', adminController.creditWallet);

module.exports = router;
