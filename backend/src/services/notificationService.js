const { messaging, db } = require('../config/firebase');

class NotificationService {
  async sendNotification(userId, title, body, data = {}) {
    try {
      // Fetch user's FCM token from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        console.warn(`[Notification] User ${userId} not found`);
        return;
      }

      const userData = userDoc.data();
      const token = userData.fcmToken; // Ensure frontend saves token here

      console.log(`[Notification] To: ${userId} | ${title}: ${body}`);

      if (token) {
        await messaging.send({
          token,
          notification: { title, body },
          data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile handling
            sound: 'default'
          }
        });
        console.log(`[Notification] Sent to ${userId}`);
      } else {
        console.warn(`[Notification] No FCM token for user ${userId}`);
      }

      // Optional: Store notification in Firestore for "In-App" history
      await db.collection('notifications').add({
        userId,
        title,
        body,
        data,
        read: false,
        createdAt: new Date()
      });

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}

module.exports = new NotificationService();
