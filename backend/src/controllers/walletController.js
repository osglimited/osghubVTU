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

module.exports = {
  getBalance,
  getHistory
};
