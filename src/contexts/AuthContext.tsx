'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { generateHash } from '@/lib/crypto';
import { UserProfile, SignUpData, LoginCredentials, AuthState, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const requireEmailVerification = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    initialized: false,
  });

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> => {
    return Promise.race([
      promise,
      new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), ms))
    ]);
  };

  // Load user data from Firestore
  const loadUserData = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setState(prev => ({
        ...prev,
        user: null,
        loading: false,
        initialized: true,
      }));
      return;
    }

    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        let userData = userDoc.data() as Omit<UserProfile, 'uid'>;

        // If auth says email is verified but Firestore isn't updated, fix it
        if (firebaseUser.emailVerified && !userData.isVerified) {
          await updateDoc(userRef, { isVerified: true, updatedAt: new Date().toISOString() });
          userData = { ...userData, isVerified: true };
        }

        // Ensure walletBalance and accountStatus exist
        if (typeof userData.walletBalance === 'undefined') {
          await updateDoc(userRef, { walletBalance: 0 });
          userData.walletBalance = 0;
        }

        if (!userData.accountStatus) {
          await updateDoc(userRef, { accountStatus: 'active' });
          userData.accountStatus = 'active';
        }

        setState(prev => ({
          ...prev,
          user: { uid: firebaseUser.uid, ...userData },
          loading: false,
          initialized: true,
        }));
      } else {
        // Create user document if it doesn't exist
        const newUser: Omit<UserProfile, 'uid'> = {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          emailVerified: firebaseUser.emailVerified,
          phoneNumber: firebaseUser.phoneNumber || null,
          metadata: {
            creationTime: firebaseUser.metadata.creationTime,
            lastSignInTime: firebaseUser.metadata.lastSignInTime,
          },
          fullName: firebaseUser.displayName || '',
          username: firebaseUser.email?.split('@')[0] || '',
          phone: firebaseUser.phoneNumber || '',
          pinHash: '',
          referral: undefined,
          isVerified: firebaseUser.emailVerified,
          walletBalance: 0,
          accountStatus: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        
        setState(prev => ({
          ...prev,
          user: { uid: firebaseUser.uid, ...newUser },
          loading: false,
          initialized: true,
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load user data',
        loading: false,
        initialized: true,
      }));
    }
  }, []);

  // Set up auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await loadUserData(firebaseUser);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [loadUserData]);

  // Sign up a new user
  const signUp = async (data: SignUpData) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
      const actionCodeSettings = { url: `${appUrl}/verify-email`, handleCodeInApp: true };

      // Check username uniqueness
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', data.username)
      );
      try {
        const usernameSnapshotOrTimeout = await withTimeout(getDocs(usernameQuery), 5000);
        if (usernameSnapshotOrTimeout !== 'timeout') {
          const usernameSnapshot = usernameSnapshotOrTimeout;
          if (!usernameSnapshot.empty) {
            throw new Error('This username is already taken. Please choose another one.');
          }
        } else {
          console.warn('Username uniqueness check timed out, proceeding');
        }
      } catch (e) {
        console.warn('Username uniqueness check failed, proceeding', e);
      }

      // Create user with email and password
      const userCredentialOrTimeout = await withTimeout(createUserWithEmailAndPassword(auth, data.email, data.password), 10000);
      if (userCredentialOrTimeout === 'timeout') {
        throw new Error('Network timeout while creating account. Please check your connection and try again.');
      }
      const { user } = userCredentialOrTimeout;

      // Update user profile
      await firebaseUpdateProfile(user, {
        displayName: data.fullName,
      });

      if (requireEmailVerification) {
        const sendEmailResult = await withTimeout(firebaseSendEmailVerification(user, actionCodeSettings), 8000);
        if (sendEmailResult === 'timeout') {
          console.warn('Email verification send timed out');
        }
      }

      // Hash the transaction PIN
      const pinHash = await generateHash(data.transactionPin);

      // Create user document in Firestore (with wallet initialization)
      const userDoc: Omit<UserProfile, 'uid'> = {
        email: user.email || '',
        displayName: data.fullName,
        emailVerified: user.emailVerified,
        phoneNumber: data.phone,
        metadata: {
          creationTime: user.metadata.creationTime || new Date().toISOString(),
          lastSignInTime: user.metadata.lastSignInTime || new Date().toISOString(),
        },
        fullName: data.fullName,
        username: data.username,
        phone: data.phone,
        pinHash,
        referral: data.referralUsername,
        isVerified: requireEmailVerification ? false : true,
        walletBalance: 0,
        accountStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const setDocResult = await withTimeout(setDoc(doc(db, 'users', user.uid), userDoc), 8000);
        if (setDocResult === 'timeout') {
          console.warn('User document creation timed out');
        }
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
          console.warn('Skipping Firestore user document creation due to permissions during development');
        } else {
          throw e;
        }
      }

      // Update state with new user data
      setState(prev => ({
        ...prev,
        user: { uid: user.uid, ...userDoc },
        loading: false,
      }));

      return user;
    } catch (error: any) {
      console.error('Error signing up:', error);
      let errorMessage = error.message || 'Failed to create an account';
      const code = error?.code || '';
      if (code === 'auth/configuration-not-found') {
        errorMessage = 'Authentication provider is not configured. Enable Email/Password in Firebase Auth and add your domain to Authorized domains.';
      } else if (code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password sign-in is disabled. Enable it in Firebase Auth.';
      } else if (code === 'auth/invalid-api-key' || code === 'auth/invalid-auth') {
        errorMessage = 'Invalid Firebase configuration. Check NEXT_PUBLIC_FIREBASE_* environment variables.';
      } else if (code === 'auth/unauthorized-domain') {
        errorMessage = 'Unauthorized domain. Add localhost and your dev host to Firebase Auth Authorized domains.';
      }
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw new Error(errorMessage);
    }
  };

  // Sign in with email and password
  const signIn = async ({ email, password, rememberMe = false }: LoginCredentials) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      // Check if email is verified
      if (requireEmailVerification && !user.emailVerified) {
        await signOut();
        throw new Error('Please verify your email before signing in.');
      }

      // If email is verified, make sure Firestore reflects it
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { isVerified: true, updatedAt: new Date().toISOString() });
      } catch (err) {
        // Non-fatal: log and continue
        console.warn('Could not update isVerified in Firestore:', err);
      }

      // Load user data
      await loadUserData(user);
      
      return user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      const errorMessage = error.message || 'Failed to sign in';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
      throw new Error(errorMessage);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setState(prev => ({
        ...prev,
        user: null,
        error: null,
      }));
    } catch (error) {
      console.error('Error signing out:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to sign out',
      }));
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      await firebaseSendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  };

  // Send email verification
  const verifyEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }
    
    try {
      if (!requireEmailVerification) {
        return;
      }
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
      const actionCodeSettings = { url: `${appUrl}/verify-email`, handleCodeInApp: true };
      const resendResult = await withTimeout(firebaseSendEmailVerification(auth.currentUser, actionCodeSettings), 8000);
      if (resendResult === 'timeout') {
        throw new Error('Network timeout while sending verification email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw new Error('Failed to send verification email');
    }
  };

  // Verify transaction PIN
  const verifyTransactionPin = async (pin: string): Promise<boolean> => {
    if (!state.user) return false;
    
    try {
      const pinHash = await generateHash(pin);
      return pinHash === state.user.pinHash;
    } catch (error) {
      console.error('Error verifying transaction PIN:', error);
      return false;
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }

    try {
      const updates: Record<string, any> = { ...data, updatedAt: new Date().toISOString() };
      
      // Update Firebase Auth profile if display name or photo URL changed
      if (data.displayName || data.photoURL) {
        await firebaseUpdateProfile(auth.currentUser, {
          displayName: data.displayName || auth.currentUser.displayName || '',
          photoURL: data.photoURL || auth.currentUser.photoURL || undefined,
        });
      }

      // Update Firestore document
      await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
      
      // Update local state
      if (state.user) {
        setState(prev => ({
          ...prev,
          user: { ...prev.user!, ...updates },
        }));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (auth.currentUser) {
      await loadUserData(auth.currentUser);
    }
  };

  const value: AuthContextType = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    signUp,
    signIn,
    signOut,
    resetPassword,
    verifyEmail,
    verifyTransactionPin,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
