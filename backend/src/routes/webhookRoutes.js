const express = require('express');
const flutterwaveService = require('../services/flutterwaveService');
const walletService = require('../services/walletService');
const { db } = require('../config/firebase');

const router = express.Router();

router.post('/flutterwave', express.json({ type: '*/*' }), async (req, res) => {
  try {
    const signature = req.headers['verif-hash'];
    const secret = process.env.FLW_SECRET_HASH || '';
    if (secret && signature !== secret) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
    const event = req.body;
    const id = event?.data?.id;
    const tx_ref = event?.data?.tx_ref;
    const amount = event?.data?.amount;
    const meta = event?.data?.meta || {};
    let userId = meta.userId;

    if (!amount) {
      return res.status(400).json({ error: 'Missing amount' });
    }

    // If userId is missing from webhook metadata, try to find it in our records using tx_ref
    if (!userId && tx_ref) {
      try {
        const paymentDoc = await db.collection('payments').doc(tx_ref).get();
        if (paymentDoc.exists) {
          userId = paymentDoc.data().userId;
        }
      } catch (err) {
        console.error('Error fetching payment for webhook recovery:', err);
      }
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const updateData = {
      tx_ref: tx_ref || String(id),
      userId,
      amount,
      status: 'pending',
      provider: 'flutterwave',
      updatedAt: new Date(),
    };
    
    // Only set createdAt if it's a new document or we want to track webhook time
    // But since we use merge: true, let's keep it simple but avoid overwriting if exists?
    // Actually, simply using set with merge is fine, as long as userId is defined.
    
    await db.collection('payments').doc(tx_ref || String(id)).set(updateData, { merge: true });

    if (!process.env.FLW_SECRET_KEY) {
      await db.collection('payments').doc(tx_ref || String(id)).update({
        status: 'success',
        verifiedAt: new Date(),
        providerResponse: event?.data || {},
      });
      await walletService.createWallet(userId);
      await walletService.creditWallet(userId, Number(amount), 'main', 'Flutterwave Wallet Funding (DEV)');
      return res.json({ success: true, data: event?.data || {} });
    } else {
      const result = await flutterwaveService.creditIfValid(id || tx_ref, amount, userId);
      return res.json(result);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
