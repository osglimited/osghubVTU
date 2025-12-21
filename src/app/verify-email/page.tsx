'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push('/login'), 1500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <AuthLayout>
      <Card className="bg-card/90 border-border shadow-lg max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div className="text-xl font-bold">Verification link changed</div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            We now use Firebase-hosted email verification. Please go to the sign-in page and resend the verification email.
          </p>
          <p>
            You will be redirected shortly. If not, <Link href="/login" className="text-primary hover:underline">click here</Link>.
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
