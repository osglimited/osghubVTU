const express = require('express');
const { verifyToken } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

router.use(verifyToken);

router.post('/purchase', transactionController.purchase);
router.get('/', transactionController.getHistory);

module.exports = router;
