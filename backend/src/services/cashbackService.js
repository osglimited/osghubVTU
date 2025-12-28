const walletService = require('./walletService');
const { db } = require('../config/firebase');
const notificationService = require('./notificationService');

const CASHBACK_PERCENTAGE = 0.03; // 3%
const SETTINGS_DOC = 'settings/global';

class CashbackService {
  async processCashback() {
    return;
  }
}

module.exports = new CashbackService();
