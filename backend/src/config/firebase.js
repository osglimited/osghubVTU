const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db, auth, messaging;

try {
  // Check if firebase is already initialized to avoid errors
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle private key with newlines
        privateKey: process.env.FIREBASE_PRIVATE_KEY 
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
          : undefined,
      }),
    });
    console.log('Firebase Admin Initialized');
  }
  
  db = admin.firestore();
  auth = admin.auth();
  messaging = admin.messaging();

} catch (error) {
  console.error('Firebase Admin Initialization Error:', error.message);
  console.warn('Running in MOCK mode due to missing/invalid credentials');
  
  // Mock implementations to allow server start
  const mockFn = () => ({ 
    get: async () => ({ exists: false, data: () => ({}) }),
    set: async () => {},
    update: async () => {},
    doc: () => mockFn(),
    collection: () => mockFn(),
    where: () => mockFn(),
    orderBy: () => mockFn(),
    limit: () => mockFn(),
    verifyIdToken: async () => ({ uid: 'mock-user', email: 'mock@test.com' })
  });
  
  db = { 
    collection: () => mockFn(), 
    doc: () => mockFn(), 
    runTransaction: async (cb) => cb({ get: async () => ({ exists: true, data: () => ({}) }), update: () => {}, set: () => {} }) 
  };
  auth = { verifyIdToken: async () => ({ uid: 'mock-user', email: 'mock@test.com' }) };
  messaging = { send: async () => console.log('Mock Notification Sent') };
}

module.exports = { admin, db, auth, messaging };
