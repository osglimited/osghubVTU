import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { generateHash } from './crypto';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  phoneNumber?: string | null;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  // Custom fields
  fullName: string;
  username: string;
  phone: string;
  pinHash: string;
  referral?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export const signUp = async (
  email: string,
  password: string,
  userData: Omit<UserData, 'uid' | 'email' | 'emailVerified' | 'metadata' | 'createdAt' | 'updatedAt'>
): Promise<UserCredential> => {
  try {
    // Create user with email and password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Update user profile with display name
    await updateProfile(user, {
      displayName: userData.fullName,
    });

    // Send email verification
    await sendEmailVerification(user);

    // Hash the transaction PIN
    const pinHash = await generateHash(userData.pinHash);

    // Create user document in Firestore
    const userDoc: Omit<UserData, 'uid'> = {
      email: user.email || '',
      displayName: userData.fullName,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      metadata: {
        creationTime: user.metadata.creationTime || new Date().toISOString(),
        lastSignInTime: user.metadata.lastSignInTime || new Date().toISOString(),
      },
      fullName: userData.fullName,
      username: userData.username,
      phone: userData.phone,
      pinHash,
      referral: userData.referral,
      isVerified: false, // Will be true after email verification
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);

    return userCredential;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Check if email is verified
    if (!user.emailVerified) {
      await signOut();
      throw new Error('Please verify your email before signing in.');
    }

    return userCredential;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { uid: userId, ...userDoc.data() } as UserData;
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

export const verifyTransactionPin = async (userId: string, pin: string): Promise<boolean> => {
  try {
    const userData = await getUserData(userId);
    if (!userData) return false;
    
    const pinHash = await generateHash(pin);
    return pinHash === userData.pinHash;
  } catch (error) {
    console.error('Error verifying transaction PIN:', error);
    return false;
  }
};
