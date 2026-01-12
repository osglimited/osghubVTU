import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged as firebaseOnAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword } from 'firebase/auth';
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
  let cred: any;
  try {
    cred = await signInWithEmailAndPassword(auth, email, password);
  } catch (e: any) {
    if (e && e.code === 'auth/user-not-found') {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } else {
      throw e;
    }
  }
  const token = await cred.user.getIdTokenResult();
  const allowed = (import.meta.env.VITE_ADMIN_EMAILS || 'osglimited7@gmail.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = (cred.user.email || '').toLowerCase();
  const isAdmin = Boolean(token.claims && (token.claims.admin === true)) || (userEmail && allowed.includes(userEmail));
  if (!isAdmin) {
    await firebaseSignOut(auth);
    throw new Error('Access denied: admin only');
  }
  return cred.user;
};

export const signOut = async () => {
  await firebaseSignOut(auth);
};
