import { useState } from 'react';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { SignUpData, LoginCredentials } from '@/types/auth';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification, signOut as firebaseSignOut } from 'firebase/auth';

// Validation schemas
const baseSignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  transactionPin: z
    .string()
    .min(4, 'PIN must be at least 4 digits')
    .max(6, 'PIN cannot be longer than 6 digits')
    .regex(/^\d+$/, 'PIN must contain only numbers'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }).optional(),
  referralUsername: z.string().optional(),
});

// UI-level schema (includes confirmPassword match)
const signUpSchema = baseSignUpSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

// API payload schema (no confirmPassword required)
const apiSignUpSchema = baseSignUpSchema.omit({ confirmPassword: true });

// Schema for API payload (no confirmPassword)
// (duplicate declaration removed; already defined above)


const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type FormErrors<T> = Partial<Record<keyof T, string>>;

export function useAuthForm() {
  const { addNotification } = useNotifications();
  const router = useRouter();
  const { signUp, signIn, resetPassword, verifyEmail } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors<SignUpData & LoginCredentials>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const validateForm = <T extends Record<string, any>>(
    data: T,
    schema: z.ZodSchema
  ): { isValid: boolean; errors: FormErrors<T> } => {
    try {
      schema.parse(data);
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = error.errors.reduce<FormErrors<T>>((acc, curr) => {
          const path = curr.path[0] as keyof T;
          acc[path] = curr.message;
          return acc;
        }, {});
        return { isValid: false, errors: fieldErrors };
      }
      return { isValid: false, errors: {} };
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    console.log('[DEBUG] handleSignUp start', { email: data.email, username: data.username });
    // Validate payload against API schema (no confirmPassword)
    const { isValid, errors } = validateForm(data, apiSignUpSchema);
    setErrors(errors);
    if (!isValid) {
      console.warn('[DEBUG] handleSignUp validation failed', errors);
      throw new Error('Form validation failed: ' + JSON.stringify(errors));
    }

    setIsLoading(true);
    try {
      await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        username: data.username,
        phone: data.phone,
        transactionPin: data.transactionPin,
        referralUsername: data.referralUsername,
      });

      console.log('[DEBUG] handleSignUp success', { email: data.email });
      addNotification('success', 'Account created!', 'Please check your email to verify your account.');
      router.push('/login');
    } catch (error: any) {
      console.error('[DEBUG] handleSignUp error', error);
      addNotification('error', 'Error', error.message || 'Failed to create account. Please try again.');
      throw error; // rethrow so callers can react (and we log in the page)
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (data: LoginCredentials) => {
    const { isValid, errors } = validateForm(data, loginSchema);
    setErrors(errors);
    if (!isValid) return;

    setIsLoading(true);
    try {
      await signIn({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      addNotification('success', 'Welcome back!', 'You have been successfully logged in.');
      router.push('/dashboard');
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.toLowerCase().includes('verify your email')) {
        setNeedsVerification(true);
        setPendingEmail(data.email);
        addNotification('warning', 'Email not verified', 'Please verify your email to continue.');
      } else {
        addNotification('error', 'Login failed', msg || 'Invalid email or password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email);
      addNotification('success', 'Email sent', 'Check your email for password reset instructions.');
    } catch (error: any) {
      addNotification('error', 'Error', error.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail();
      addNotification('success', 'Email sent', 'Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      addNotification('error', 'Error', error.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendVerificationFor = async (email: string, password: string) => {
    if (!email || !password) {
      setErrors({ email: !email ? 'Email is required' : undefined, password: !password ? 'Password is required' : undefined } as any);
      return;
    }
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      await firebaseSignOut(auth);
      addNotification('success', 'Email sent', 'Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      addNotification('error', 'Error', error.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    errors,
    showPassword,
    setShowPassword,
    setErrors,
    handleSignUp,
    handleLogin,
    handleForgotPassword,
    handleResendVerification,
    handleResendVerificationFor,
    needsVerification,
    pendingEmail,
    setNeedsVerification,
  };
}
