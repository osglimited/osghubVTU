import { User as FirebaseUser } from 'firebase/auth';

export interface UserProfile {
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
  walletBalance: number; // balance stored in Naira (plain number)
  accountStatus?: 'active' | 'suspended' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  username: string;
  phone: string;
  transactionPin: string;
  referralUsername?: string;
  acceptTerms?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

export interface AuthContextType extends AuthState {
  signUp: (data: SignUpData) => Promise<FirebaseUser>;
  signIn: (credentials: LoginCredentials) => Promise<FirebaseUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  verifyTransactionPin: (pin: string) => Promise<boolean>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: UserProfile | null }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_RESET' }
  | { type: 'SIGN_OUT' };

export interface AuthProviderProps {
  children: React.ReactNode;
}
