const { messaging } = require('../config/firebase');
const axios = require('axios');

class NotificationService {
  async sendNotification(userId, title, body, data = {}) {
    try {
      // Assuming we store FCM tokens in user document under 'fcmTokens' array or single 'fcmToken'
      // For this implementation, let's assume 'fcmToken' field in user doc.
      // You would need to fetch the token first.
      
      // Since we don't have direct access to tokens here without fetching user doc,
      // and for scalability we might want to use topic subscriptions or handle this asynchronously.
      
      // Ideally, the frontend saves the FCM token to the user's profile.
      
      // Let's assume we pass the token or fetch it.
      // For now, I'll just log it as we need a way to get the token.
      
      console.log(`[Notification] To: ${userId} | ${title}: ${body}`);
      
      /*
      const userDoc = await db.collection('users').doc(userId).get();
      const token = userDoc.data()?.fcmToken;
      
      if (token) {
        await messaging.send({
          token,
          notification: { title, body },
          data
        });
      }
      */
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async sendSms(phone, message, options = {}) {
    try {
      const provider = String(process.env.SMS_PROVIDER || '').toLowerCase() || 'termii';
      const senderId = options.senderId || process.env.SMS_SENDER_ID || 'OSGHUB';

      let to = String(phone).replace(/\s/g, '');
      if (to.startsWith('0')) {
        to = '234' + to.slice(1);
      }

      if (provider === 'payless') {
        const username = process.env.PAYLESS_SMS_USERNAME || '';
        const password = process.env.PAYLESS_SMS_PASSWORD || '';
        const baseUrl = process.env.PAYLESS_SMS_BASE_URL || 'https://portal.paylessbulksms.com.ng/components/com_spc/smsapi.php';
        if (!username || !password) {
          throw new Error('Missing Payless SMS credentials');
        }
        const params = new URLSearchParams({
          username,
          password,
          sender: senderId,
          recipient: to,
          message: String(message)
        }).toString();
        const url = `${baseUrl}?${params}`;
        await axios.get(url, { timeout: 15000 });
      } else {
        const apiKey = process.env.SMS_TERMII_API_KEY || '';
        const channel = process.env.SMS_CHANNEL || 'dnd';
        if (!apiKey) {
          throw new Error('Missing Termii API key');
        }
        const payload = {
          api_key: apiKey,
          to: to,
          from: senderId,
          sms: String(message),
          type: 'plain',
          channel
        };
        await axios.post('https://api.ng.termii.com/api/sms/send', payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });
      }
    } catch (error) {
      console.error('Error sending SMS:', error?.response?.data || error?.message || String(error));
      throw error; // Allow caller to handle failure logging
    }
  }
}

module.exports = new NotificationService();
