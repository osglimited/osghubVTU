'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
export const dynamic = 'force-dynamic';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('oobCode');
    const mode = searchParams.get('mode');
    if (!code || mode !== 'verifyEmail') {
      setStatus('error');
      setMessage('Invalid verification link. Please request a new one.');
      return;
    }
    const verify = async () => {
      setStatus('verifying');
      try {
        await applyActionCode(auth, code);
        setStatus('success');
        setMessage('Your email has been verified. You can now sign in.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.message || 'Verification failed. Please request a new link.');
      }
    };
    verify();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-[#0A1F44] mb-4">Email Verification</h1>
        {status === 'verifying' && (
          <p className="text-gray-600">Verifying your email, please wait...</p>
        )}
        {status === 'success' && (
          <>
            <p className="text-green-700 bg-green-50 border border-green-200 rounded-md p-3 mb-4">{message}</p>
            <Link href="/login">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-4">{message}</p>
            <Link href="/login">
              <Button variant="outline" className="w-full">Resend from Sign In</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
