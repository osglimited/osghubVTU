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

    if (!['cashback', 'referral'].includes(fromWallet)) {
      return res.status(400).json({ error: 'Invalid source wallet' });
    }

    const result = await walletService.transferBalance(uid, Number(amount), fromWallet, 'main');
    res.json({ message: 'Transfer successful', balances: result });
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

module.exports = {
  getBalance,
  transferToMain,
  getHistory
};
