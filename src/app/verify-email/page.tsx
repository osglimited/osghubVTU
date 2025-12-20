"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthForm } from "@/hooks/useAuthForm";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const { handleResendVerification, isLoading } = useAuthForm();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const onResendClick = async () => {
    if (email && resendCooldown === 0) {
      await handleResendVerification(email);
      setResendCooldown(60); // 60 seconds cooldown
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
    </AuthLayout>
  );
}
