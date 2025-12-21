"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle, ArrowLeft, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthForm } from "@/hooks/useAuthForm";
import { applyActionCode, checkActionCode } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

function VerifyEmailContent() {
  const router = useRouter();
  const { handleResendVerification, isLoading } = useAuthForm();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { refreshUser } = useAuth();
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(auth.currentUser?.email || null);
  const [mode, setMode] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [linkApiKey, setLinkApiKey] = useState<string | null>(null);

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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("mode");
      const code = params.get("oobCode");
      const key = params.get("apiKey");
      const em = params.get("email");
      setMode(m);
      setOobCode(code);
      setLinkApiKey(key);
      if (em && !resolvedEmail) {
        setResolvedEmail(em);
      }
    }
  }, []);

  useEffect(() => {
    const appApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (mode === "verifyEmail" && oobCode) {
      if (linkApiKey && appApiKey && linkApiKey !== appApiKey) {
        setErrorMessage("The verification link is for a different Firebase project. Please resend the verification email.");
        setStatus("error");
        return;
      }
      setStatus("verifying");
      (async () => {
        try {
          try {
            const info = await checkActionCode(auth, oobCode);
            const infoEmail = (info as any)?.data?.email || (info as any)?.email;
            if (infoEmail && !resolvedEmail) {
              setResolvedEmail(infoEmail);
            }
          } catch (checkErr: any) {
            setErrorMessage("This verification link is invalid or has already been used. Please resend the verification email.");
            setStatus("error");
            return;
          }
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
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        } catch (err: any) {
          setErrorMessage(err?.message || "Could not verify email. The link may be invalid or expired.");
          setStatus("error");
        }
      })();
    }
  }, [mode, oobCode, linkApiKey, refreshUser, resolvedEmail, router]);

  const onResendClick = async () => {
    if (resolvedEmail && resendCooldown === 0) {
      await handleResendVerification(resolvedEmail);
      setResendCooldown(60);
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
            Your account has been verified. Redirecting to sign in.
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
            disabled={isLoading || resendCooldown > 0 || !resolvedEmail}
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
          <span className="font-medium text-foreground">{resolvedEmail || "your email address"}</span>
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
          disabled={isLoading || resendCooldown > 0 || !resolvedEmail}
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
      <VerifyEmailContent />
    </AuthLayout>
  );
}
