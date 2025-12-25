const express = require('express');
const webhookController = require('../controllers/webhookController');

const router = express.Router();

// Webhook endpoint (Public, but requires signature verification inside controller)
router.post('/fund', webhookController.fundWallet);

module.exports = router;
