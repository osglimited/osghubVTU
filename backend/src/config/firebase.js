const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

let db, auth, messaging;

try {
  // Check if firebase is already initialized to avoid errors
  if (!admin.apps.length) {
    // Sanitize env variables that may be pasted with quotes/commas from UIs
    const sanitize = (val) => {
      if (!val || typeof val !== 'string') return val;
      let s = val.trim();
      if (s.startsWith('"')) s = s.slice(1);
      if (s.endsWith('"')) s = s.slice(0, -1);
      // Remove trailing commas sometimes copied from JSON
      if (s.endsWith(',')) s = s.slice(0, -1);
      return s;
    };
    const projectId = sanitize(process.env.FIREBASE_PROJECT_ID);
    const clientEmail = sanitize(process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Firebase Project ID:', projectId);
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
        // Remove surrounding quotes if present (common issue with dotenv/env vars)
        // Check start and end manually
        // console.log('DEBUG: Starts with quote?', privateKey.startsWith('"'));
        // console.log('DEBUG: Ends with quote?', privateKey.endsWith('"'));
        // console.log('DEBUG: Last char:', privateKey.charCodeAt(privateKey.length - 1));

        if (privateKey.startsWith('"')) {
            privateKey = privateKey.slice(1);
        }
        if (privateKey.endsWith('"')) {
            privateKey = privateKey.slice(0, -1);
        }
        
        // Handle newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    // console.log('Private Key Start:', privateKey ? privateKey.substring(0, 50) : 'None');
    if (privateKey) {
       console.log('Private Key Length:', privateKey.length);
       console.log('Private Key Header:', privateKey.substring(0, 40));
       console.log('Private Key Line Count:', privateKey.split('\n').length);
       console.log('Private Key First 3 Lines:', privateKey.split('\n').slice(0, 3));
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey,
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
