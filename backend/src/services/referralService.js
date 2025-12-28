const walletService = require('./walletService');
const { db } = require('../config/firebase');
const notificationService = require('./notificationService');

const REFERRAL_BONUS_AMOUNT = 10; // Configurable
const SETTINGS_DOC = 'settings/global';

class ReferralService {
  async processReferral() {
    return;
  }
}

module.exports = new ReferralService();
