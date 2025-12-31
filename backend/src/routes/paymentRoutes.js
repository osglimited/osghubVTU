const express = require('express');
const { verifyToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.use(verifyToken);

router.post('/initiate', paymentController.initiate);
router.post('/verify', paymentController.verify);

module.exports = router;
