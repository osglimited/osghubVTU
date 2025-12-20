"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthForm } from "@/hooks/useAuthForm";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");
  const { handleResendVerification, isLoading } = useAuthForm();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [manualCode, setManualCode] = useState<string>("");
  const requireEmailVerification = process.env.NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION === 'true';

  useEffect(() => {
    if (!requireEmailVerification) {
      router.replace('/login');
    }
  }, [requireEmailVerification, router]);

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
    const verifyWithCode = async () => {
      if ((mode === "verifyEmail" || mode === "action") && oobCode) {
        setStatus("verifying");
        try {
          await applyActionCode(auth, oobCode);
          setStatus("success");
          setStatusMessage("Your email has been verified successfully.");
        } catch (err: any) {
          setStatus("error");
          setStatusMessage(err?.message || "Failed to verify email.");
        }
      }
    };
    verifyWithCode();
  }, [mode, oobCode]);

  const onResendClick = async () => {
    if (email && resendCooldown === 0) {
      await handleResendVerification(email);
      setResendCooldown(60);
    }
  };

  return (
    <AuthLayout>
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
          {status === "verifying" && (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying your email…
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center justify-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              {statusMessage}
            </div>
          )}
          {status === "error" && (
            <div className="text-sm text-destructive text-center">{statusMessage}</div>
          )}

          <div className="text-sm text-center text-muted-foreground">
            Click the link in the email to verify your account. If you don't see it, check your spam folder.
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              If the link doesn’t open, copy the code from your email link (the value after <code>oobCode=</code>)
              and paste it below to verify manually.
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Paste verification code (oobCode)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <Button
                onClick={async () => {
                  const code = manualCode.trim();
                  if (!code) return;
                  if (code.includes("@") || code.length < 10) {
                    setStatus("error");
                    setStatusMessage("Please paste the verification code from your email link (oobCode), not your email address.");
                    return;
                  }
                  setStatus("verifying");
                  try {
                    await applyActionCode(auth, code);
                    setStatus("success");
                    setStatusMessage("Your email has been verified successfully.");
                  } catch (err: any) {
                    setStatus("error");
                    setStatusMessage(err?.message || "Failed to verify email.");
                  }
                }}
                variant="default"
              >
                Verify manually
              </Button>
            </div>
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
    </AuthLayout>
  );
}
