"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle, ArrowLeft, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthForm } from "@/hooks/useAuthForm";
import { applyActionCode } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { handleResendVerification, isLoading } = useAuthForm();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");
    if (mode === "verifyEmail" && oobCode) {
      setStatus("verifying");
      (async () => {
        try {
          await applyActionCode(auth, oobCode);
          try {
            await auth.currentUser?.reload();
          } catch {}
          try {
            if (auth.currentUser?.uid) {
              await updateDoc(doc(db, "users", auth.currentUser.uid), {
                isVerified: true,
                updatedAt: new Date().toISOString(),
              });
            }
          } catch {}
          try {
            await refreshUser();
          } catch {}
          setStatus("success");
        } catch (err: any) {
          setErrorMessage(err?.message || "Could not verify email. The link may be invalid or expired.");
          setStatus("error");
        }
      })();
    }
  }, [searchParams, refreshUser]);

  const onResendClick = async () => {
    if (email && resendCooldown === 0) {
      await handleResendVerification(email);
      setResendCooldown(60); // 60 seconds cooldown
    }
  };

  if (status === "verifying") {
    return (
      <Card className="bg-card/90 border-border shadow-lg max-w-md w-full">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifying your email</CardTitle>
          <CardDescription className="text-base">
            Please wait while we confirm your email address.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="bg-card/90 border-border shadow-lg max-w-md w-full">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Email verified</CardTitle>
          <CardDescription className="text-base">
            Your account has been verified. You can now sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center pt-2">
          <Link 
            href="/login" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="bg-card/90 border-border shadow-lg max-w-md w-full">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
            <XCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Verification failed</CardTitle>
          <CardDescription className="text-base">
            {errorMessage || "We couldn't verify your email. The link may be invalid or expired."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onResendClick}
            variant="outline"
            className="w-full h-11"
            disabled={isLoading || resendCooldown > 0 || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend email in ${resendCooldown}s`
            ) : (
              "Resend verification email"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center pt-2">
          <Link 
            href="/login" 
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="bg-card/90 border-border shadow-lg max-w-md w-full">
      <CardHeader className="text-center space-y-2 pb-6">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
        <CardDescription className="text-base">
          We've sent a verification link to
          <br />
          <span className="font-medium text-foreground">{email || "your email address"}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Click the link in the email to verify your account. If you don't see it, check your spam folder.
        </div>

        <Button
          onClick={onResendClick}
          variant="outline"
          className="w-full h-11"
          disabled={isLoading || resendCooldown > 0 || !email}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            `Resend email in ${resendCooldown}s`
          ) : (
            "Resend verification email"
          )}
        </Button>
      </CardContent>

      <CardFooter className="flex justify-center pt-2">
        <Link 
          href="/login" 
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
