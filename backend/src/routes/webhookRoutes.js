const express = require('express');
const { db } = require('../config/firebase');
const router = express.Router();

// Simple verification for SublinkNG webhook
// Accept either header x-signature or query token that matches env SUBLINKNG_WEBHOOK_SECRET or VTU_PROVIDER_B_KEY
const verifySublink = (req) => {
  const headerSig = req.headers['x-signature'] || req.headers['x-webhook-signature'] || '';
  const qsToken = req.query.token || '';
  const secret = process.env.SUBLINKNG_WEBHOOK_SECRET || process.env.VTU_PROVIDER_B_KEY || '';
  return secret && (headerSig === secret || qsToken === secret);
};

router.post('/sublinkng', async (req, res) => {
  try {
    if (!verifySublink(req)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const payload = req.body || {};
    const providerReference = payload.reference || payload.transRef || payload.transactionId || payload.id;
    const status = (payload.status || '').toLowerCase();
    const normalized =
      status.includes('success') ? 'success' :
      status.includes('failed') ? 'failed' :
      status.includes('pending') ? 'pending' : 'pending';

    if (!providerReference) {
      return res.status(400).json({ error: 'Missing provider reference' });
    }

    // Find transaction by providerReference
    const snap = await db.collection('transactions')
      .where('providerReference', '==', providerReference)
      .limit(1)
      .get();

    if (snap.empty) {
      // If not found, try by requestId or reference in payload, else log
      await db.collection('transactions').doc(`webhook-${Date.now()}`).set({
        note: 'Webhook received but transaction not found',
        providerReference,
        payload,
        createdAt: new Date()
      });
      return res.json({ message: 'Webhook accepted (transaction not found yet)' });
    }

    const txRef = snap.docs[0].ref;
    const txData = snap.docs[0].data();

    // Update status if changed
    await txRef.update({
      status: normalized,
      webhookPayload: payload,
      updatedAt: new Date()
    });

    // If failed and original status was pending, refund defensively
    if (normalized === 'failed' && txData.status !== 'failed') {
      const walletService = require('../services/walletService');
      await walletService.creditWallet(txData.userId, txData.amount, 'main', `Refund by webhook: ${txData.type}`);
    }

    res.json({ message: 'Webhook processed', status: normalized });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
