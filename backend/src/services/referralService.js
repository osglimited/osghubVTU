const walletService = require('./walletService');
const { db } = require('../config/firebase');
const notificationService = require('./notificationService');

const REFERRAL_BONUS_AMOUNT = 10; // Configurable
const SETTINGS_DOC = 'settings/global';

class ReferralService {
  
  async getDailyBudget() {
    const settings = await db.doc(SETTINGS_DOC).get();
    if (!settings.exists) return 1000; // Default
    return settings.data().dailyReferralBudget || 0;
  }

  async getDailyUsage() {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = db.collection('daily_stats').doc(today);
    const doc = await statsRef.get();
    if (!doc.exists) return 0;
    return doc.data().referralPayout || 0;
  }

  async incrementDailyUsage(amount) {
    const today = new Date().toISOString().split('T')[0];
    const statsRef = db.collection('daily_stats').doc(today);
    
    await db.runTransaction(async (t) => {
      const doc = await t.get(statsRef);
      const current = doc.exists ? (doc.data().referralPayout || 0) : 0;
      t.set(statsRef, { referralPayout: current + amount }, { merge: true });
    });
  }

  async processReferral(userId, transactionId) {
    try {
      // 1. Get User Profile to find referrer
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return;
      
      const userData = userDoc.data();
      const referrerId = userData.referredBy;

      if (!referrerId) return;

      // 2. Check Budget
      const budget = await this.getDailyBudget();
      const usage = await this.getDailyUsage();

      if (usage + REFERRAL_BONUS_AMOUNT > budget) {
        console.log('Daily referral budget exceeded');
        await notificationService.sendNotification(
          referrerId,
          'Referral Bonus Missed',
          'Daily referral budget exceeded. No bonus credited.'
        );
        return;
      }

      // 3. Credit Referrer
      await walletService.creditWallet(
        referrerId,
        REFERRAL_BONUS_AMOUNT,
        'referral',
        `Referral bonus from user ${userId}`
      );

      // 4. Update Usage
      await this.incrementDailyUsage(REFERRAL_BONUS_AMOUNT);
      
      await notificationService.sendNotification(
        referrerId,
        'Referral Bonus',
        `You earned ₦${REFERRAL_BONUS_AMOUNT} referral bonus!`
      );

    } catch (error) {
      console.error('Error processing referral:', error);
    }
  }
}

module.exports = new ReferralService();
