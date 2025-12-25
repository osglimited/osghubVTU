const walletService = require('../services/walletService');

const getBalance = async (req, res) => {
  try {
    const { uid } = req.user;
    const balance = await walletService.getBalance(uid);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const transferToMain = async (req, res) => {
  try {
    const { uid } = req.user;
    const { amount, fromWallet } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const result = await walletService.transferToMain(uid, amount, fromWallet);
    res.json({ message: 'Transfer successful', ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const history = await walletService.getHistory(uid);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const testCredit = async (req, res) => {
  try {
    const { uid } = req.user;
    
    // 1. Ensure wallet exists
    await walletService.createWallet(uid);
    
    // 2. Credit the wallet
    const newBalance = await walletService.creditWallet(uid, 5000, 'main', 'End-to-End Test Credit');
    
    res.json({ 
      message: 'Test credit successful', 
      balance: newBalance 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getBalance,
  transferToMain,
  getHistory,
  testCredit
};
