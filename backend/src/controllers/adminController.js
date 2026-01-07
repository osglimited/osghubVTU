const { db } = require('../config/firebase');

const SETTINGS_DOC = 'settings/global';

const updateSettings = async (req, res) => {
  try {
    const { dailyReferralBudget, cashbackEnabled, pricing } = req.body;
    
    await db.doc(SETTINGS_DOC).set({
      dailyReferralBudget,
      cashbackEnabled,
      pricing,
      updatedAt: new Date()
    }, { merge: true });

    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const doc = await db.doc(SETTINGS_DOC).get();
    res.json(doc.exists ? doc.data() : {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const snapshot = await db.collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const transactions = snapshot.docs.map(doc => doc.data());
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const walletService = require('../services/walletService');

const creditWallet = async (req, res) => {
  try {
    const { userId, amount, walletType, description } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Valid amount is required' });
    const wtype = ['main', 'cashback', 'referral'].includes(walletType) ? walletType : 'main';
    await walletService.createWallet(userId);
    const newBalance = await walletService.creditWallet(userId, amt, wtype, description || 'Admin Credit');
    res.json({ success: true, userId, newBalance, walletType: wtype });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  updateSettings,
  getSettings,
  getAllTransactions,
  creditWallet
};
