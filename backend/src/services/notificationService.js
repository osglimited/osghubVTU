const { messaging } = require('../config/firebase');

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
}

module.exports = new NotificationService();
