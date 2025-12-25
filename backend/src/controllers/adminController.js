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

module.exports = {
  updateSettings,
  getSettings,
  getAllTransactions
};
