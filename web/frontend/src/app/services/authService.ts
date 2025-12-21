// services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  sendEmailVerification,
  User,
  AuthError,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthResponse {
  success: boolean;
  user?: User | null;
  error?: string;
}

export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Update user profile with display name
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName });
      await sendVerificationEmail();
    }

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const logout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const updateUserProfile = async (updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<AuthResponse> => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }

    await updateProfile(auth.currentUser, updates);
    return { success: true, user: auth.currentUser };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateUserEmail = async (newEmail: string): Promise<AuthResponse> => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }

    await updateEmail(auth.currentUser, newEmail);
    return { success: true, user: auth.currentUser };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const updateUserPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }

    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: getAuthErrorMessage(error) };
  }
};

export const sendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in');
    }

    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (error: any): string => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed.';
    case 'auth/weak-password':
      return 'Please choose a stronger password.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/requires-recent-login':
      return 'Please log in again to update your email or password.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
};
