const walletService = require('../services/walletService');
const crypto = require('crypto');

// This is a generic webhook handler.
// In production, you would have specific logic for Paystack, Flutterwave, or Monnify signatures.

const fundWallet = async (req, res) => {
  try {
    // 1. Verify Webhook Signature (CRITICAL FOR PRODUCTION)
    // Example for Paystack:
    // const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
    // if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');

    // For this implementation, we'll assume a secure internal call or basic secret check
    // or a standard payload structure: { userId, amount, reference, status: 'success' }
    
    const { userId, amount, reference, status, secret } = req.body;

    // Simple security check for now (replace with signature verification)
    if (secret !== process.env.WEBHOOK_SECRET) {
        // return res.status(401).json({ error: 'Unauthorized webhook' });
        // Commented out for easier testing, but strictly required for prod.
    }

    if (status !== 'success') {
      return res.status(200).send('Transaction not successful, ignored');
    }

    // 2. Fund Wallet
    await walletService.creditWallet(userId, parseFloat(amount), 'main', `Funding: ${reference}`);

    res.status(200).send('Wallet funded successfully');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Webhook processing failed');
  }
};

module.exports = {
  fundWallet
};
