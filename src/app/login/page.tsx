'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { useForm } from 'react-hook-form';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));

      if (!userDoc.data()?.isVerified) {
        toast.error('Please verify your account first');
        window.location.href = '/verify';
        return;
      }

      toast.success('Login successful!');
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-[#0A1F44] mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Login to your OSGHUB account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                className="input-field"
                {...register('email', { required: 'Email required' })}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                {...register('password', { required: 'Password required' })}
              />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('rememberMe')} />
              <span className="text-gray-600">Remember me</span>
            </label>

            <button type="submit" disabled={isLoading} className="btn-accent w-full">
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <p>
              <Link href="/forgot-password" className="text-[#F97316] hover:underline">
                Forgot password?
              </Link>
            </p>
            <p className="text-gray-600">
              Don't have an account? <Link href="/register" className="text-[#F97316] font-semibold">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
