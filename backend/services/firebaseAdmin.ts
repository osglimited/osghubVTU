import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// Service account configuration
const serviceAccount = {
  "type": "service_account",
  "project_id": "osghub-vtu-15678",
  "private_key_id": "37359e7f205ae7c9721fb8fec6f5465bcf92db4b",
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "",
  "client_email": "firebase-adminsdk-fbsvc@osghub-vtu-15678.iam.gserviceaccount.com",
  "client_id": "101137322777857699872",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40osghub-vtu-15678.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin if it hasn't been initialized
const getFirebaseAdmin = () => {
  if (getApps().length === 0) {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
  }
  return getApps()[0];
};

const adminApp = getFirebaseAdmin();
const auth = adminApp.auth();
const db = adminApp.firestore();
const storage = adminApp.storage();

export { adminApp, auth, db, storage };
