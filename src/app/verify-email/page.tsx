'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

export default function VerifyEmailFallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'verifyEmail' && oobCode) {
      setStatus('verifying');
      (async () => {
        try {
          await applyActionCode(auth, oobCode);
          try { await auth.currentUser?.reload(); } catch {}
          try {
            if (auth.currentUser?.uid) {
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                isVerified: true,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {}
          setStatus('success');
          setTimeout(() => router.push('/login'), 1200);
        } catch (err: any) {
          setErrorMessage(err?.message || 'Verification failed');
          setStatus('error');
        }
      })();
    } else {
      const t = setTimeout(() => router.push('/login'), 1500);
      return () => clearTimeout(t);
    }
  }, [router]);

  return (
    <AuthLayout>
      <Card className="bg-card/90 border-border shadow-lg max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            {status === 'verifying' ? <Loader2 className="w-6 h-6 text-primary animate-spin" /> : status === 'success' ? <CheckCircle className="w-6 h-6 text-green-600" /> : status === 'error' ? <XCircle className="w-6 h-6 text-destructive" /> : <Mail className="w-6 h-6 text-primary" />}
          </div>
          <div className="text-xl font-bold">{status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : status === 'verifying' ? 'Verifying...' : 'Verification'}</div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          {status === 'error' ? (
            <>
              <p>{errorMessage || 'Could not verify email. Please resend the verification from the sign-in page.'}</p>
              <p><Link href="/login" className="text-primary hover:underline">Go to sign in</Link></p>
            </>
          ) : status === 'success' ? (
            <p>Redirecting to sign in.</p>
          ) : (
            <p>You will be redirected shortly. If not, <Link href="/login" className="text-primary hover:underline">click here</Link>.</p>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
