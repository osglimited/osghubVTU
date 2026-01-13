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

    const hasValidKey = Boolean(privateKey && /BEGIN PRIVATE KEY/.test(privateKey));
    if (projectId && clientEmail && hasValidKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        db = admin.firestore();
        auth = admin.auth();
        messaging = admin.messaging();
        console.log(`Firebase initialized successfully (projectId=${projectId})`);
      } catch (initError) {
        console.error('Error initializing Firebase Admin SDK:', initError);
        // Do not throw, allow server to start without Firebase
      }
    } else {
      console.warn('Missing or invalid Firebase credentials. Skipping initialization.');
      console.warn(`ProjectId: ${!!projectId}, ClientEmail: ${!!clientEmail}, ValidKey: ${hasValidKey}`);
    }
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

module.exports = { db, auth, messaging };
