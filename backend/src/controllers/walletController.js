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


const getHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const history = await walletService.getHistory(uid);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const transferToMain = async (req, res) => {
  try {
    const { uid } = req.user;
    const { amount, fromWalletType } = req.body || {};
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    if (!['cashback', 'referral'].includes(fromWalletType)) {
      return res.status(400).json({ error: 'Invalid source wallet type' });
    }
    const result = await walletService.transferToMain(uid, Number(amount), fromWalletType);
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getBalance,
  getHistory,
  transferToMain
};
