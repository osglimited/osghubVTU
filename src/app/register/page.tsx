'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { hashPin } from '@/lib/utils';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  username: z.string().min(3, 'Username must be 3+ characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  transactionPin: z.string().regex(/^\d{4}$/, 'PIN must be 4 digits'),
  password: z.string().min(8, 'Password must be 8+ characters'),
  confirmPassword: z.string(),
  referralUsername: z.string().optional(),
  agreeTerms: z.boolean().refine((val) => val === true, 'Accept terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      // Check username uniqueness
      const usernameQuery = query(collection(db, 'users'), where('username', '==', data.username));
      const existingUser = await getDocs(usernameQuery);
      if (!existingUser.empty) {
        toast.error('Username already taken');
        setIsLoading(false);
        return;
      }

      // Create Firebase user
      const userCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const uid = userCred.user.uid;

      // Save user data to Firestore
      await setDoc(doc(db, 'users', uid), {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        phone: data.phone,
        transactionPinHash: hashPin(data.transactionPin),
        isVerified: false,
        createdAt: new Date(),
        walletBalance: 0,
        referralCode: uid.slice(0, 8).toUpperCase(),
        referredBy: data.referralUsername || null,
      });

      toast.success('Account created! Verify your email.');
      window.location.href = '/verify';
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#0A1F44] mb-2">Create Account</h1>
          <p className="text-gray-600 mb-8">Join OSGHUB VTU today</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" placeholder="John Doe" className="input-field" {...register('fullName')} />
              {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" placeholder="johndoe" className="input-field" {...register('username')} />
              {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="john@example.com" className="input-field" {...register('email')} />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" placeholder="+234..." className="input-field" {...register('phone')} />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction PIN (4 digits)</label>
              <input type="password" placeholder="••••" maxLength={4} className="input-field" {...register('transactionPin')} />
              {errors.transactionPin && <p className="text-red-500 text-sm">{errors.transactionPin.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="••••••••" className="input-field" {...register('password')} />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" placeholder="••••••••" className="input-field" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Username (Optional)</label>
              <input type="text" placeholder="Leave blank" className="input-field" {...register('referralUsername')} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('agreeTerms')} />
              <span className="text-gray-600">I agree to Terms & Privacy Policy</span>
            </label>
            {errors.agreeTerms && <p className="text-red-500 text-sm">{errors.agreeTerms.message}</p>}

            <button type="submit" disabled={isLoading} className="btn-accent w-full">
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account? <Link href="/login" className="text-[#F97316] font-semibold">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
