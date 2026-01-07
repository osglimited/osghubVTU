const flutterwaveService = require('../services/flutterwaveService');
const walletService = require('../services/walletService');
const { db } = require('../config/firebase');

const initiate = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) < 100) {
      return res.status(400).json({ error: 'Invalid amount. Minimum is ₦100.' });
    }
    const origin = (req.headers.origin || '').toLowerCase();
    const isLocal = origin.includes('localhost');
    const isRenderFrontend = origin.includes('osghubvtu.onrender.com');
    const isOsghub = origin.includes('osghub.com');
    const base =
      (isLocal && 'http://localhost:3000') ||
      (isRenderFrontend && 'https://osghubvtu.onrender.com') ||
      (isOsghub && 'https://osghub.com') ||
      (process.env.FLW_REDIRECT_URL ? process.env.FLW_REDIRECT_URL.replace(/\/+$/,'') : 'https://osghubvtu.onrender.com');
    const redirectUrl = `${base}/payment-complete`;
    const result = await flutterwaveService.initiatePayment(
      uid,
      Number(amount),
      { email, name: req.user.name, phone: req.user.phone },
      redirectUrl
    );
    res.json({ tx_ref: result.tx_ref, link: result.link });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const verify = async (req, res) => {
  try {
    const { uid } = req.user;
    const { tx_ref } = req.body;
    if (!tx_ref) return res.status(400).json({ error: 'tx_ref required' });
    const doc = await db.collection('payments').doc(tx_ref).get();
    if (!doc.exists) return res.status(404).json({ error: 'Payment not found' });
    const pay = doc.data();
    if (pay.status === 'success') return res.json({ success: true, message: 'Already credited' });
    const result = await flutterwaveService.creditIfValid(tx_ref, pay.amount, uid);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { initiate, verify };
