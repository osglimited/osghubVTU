import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged as firebaseOnAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const onAuthStateChanged = (callback: (user: any) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export const signInAdmin = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdTokenResult();
  const isAdmin = Boolean(token.claims && (token.claims.admin === true));
  if (!isAdmin) {
    await firebaseSignOut(auth);
    throw new Error('Access denied: admin only');
  }
  return cred.user;
};

export const signOut = async () => {
  await firebaseSignOut(auth);
};
