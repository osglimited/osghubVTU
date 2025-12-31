const walletService = require('./walletService');
const { db } = require('../config/firebase');
const notificationService = require('./notificationService');

const CASHBACK_PERCENTAGE = 0.03; // 3%
const SETTINGS_DOC = 'settings/global';

class CashbackService {
  async processCashback(userId, amount, transactionId) {
    // Check if cashback is enabled globally
    const settings = await db.doc(SETTINGS_DOC).get();
    if (settings.exists && settings.data().cashbackEnabled === false) {
      console.log('Cashback is disabled globally');
      return;
    }

    const cashbackAmount = amount * CASHBACK_PERCENTAGE;

    if (cashbackAmount > 0) {
      try {
        await walletService.creditWallet(
          userId, 
          cashbackAmount, 
          'cashback', 
          `Cashback for transaction ${transactionId}`
        );
        
        await notificationService.sendNotification(
          userId,
          'Cashback Received',
          `You received ₦${cashbackAmount} cashback!`
        );
      } catch (error) {
        console.error('Error processing cashback:', error);
      }
    }
  }
}

module.exports = new CashbackService();
