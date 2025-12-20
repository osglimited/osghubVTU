"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Check, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SiGoogle, SiApple } from "react-icons/si";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuthForm } from "@/hooks/useAuthForm";
import { logger } from "@/lib/logger";

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

type FormData = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  transactionPin: string;
  referralUsername: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    transactionPin: "",
    referralUsername: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // On-screen debug panel state (used for testing when DevTools aren't open)
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const addDebug = (msg: string) => setDebugMessages(prev => [...prev, `${new Date().toISOString()} - ${msg}`]);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const { 
    isLoading: isFormLoading, 
    handleSignUp 
  } = useAuthForm();
  
  const isLoading = isFormLoading || isSocialLoading;
  
  // Clear errors when form data changes
  useEffect(() => {
    if (Object.keys(formErrors).length > 0) {
      setFormErrors({});
    }
  }, [formData]);

  // Show validation failures in the debug panel and auto-open it
  useEffect(() => {
    if (Object.keys(formErrors).length > 0) {
      const entries = Object.entries(formErrors).map(([k, v]) => `${k}: ${v}`).join(' | ');
      addDebug(`[VALIDATION] ${entries}`);
      setDebugVisible(true);
    }
  }, [formErrors]);

  // Capture global errors to the debug panel (helpful while testing)
  useEffect(() => {
    const onError = (e: ErrorEvent) => addDebug(`[window/error] ${e?.message || 'unknown error'}`);
    const onRejection = (e: PromiseRejectionEvent) => addDebug(`[unhandledrejection] ${e?.reason || e}`);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection as any);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection as any);
    };
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers and underscores";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[0-9]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.transactionPin) {
      newErrors.transactionPin = "Transaction PIN is required";
    } else if (!/^[0-9]{4,6}$/.test(formData.transactionPin)) {
      newErrors.transactionPin = "PIN must be 4-6 digits";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordRequirements.every((req) => req.test(formData.password))) {
      newErrors.password = "Password does not meet requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    // Use `setFormErrors` instead of non-existing `setErrors` and return status
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();

    // Debug log to confirm submit fired
    console.log('[DEBUG] Registration form submit fired', formData);
    addDebug(`[SUBMIT] Registration form submit fired: ${formData.email} | ${formData.username}`);
    logger.debug('Registration form submission started', {
      email: formData.email,
      username: formData.username,
      hasReferral: !!formData.referralUsername
    });
    
    // Clear previous errors
    setFormErrors({});
    
    // Validate form
    if (!validateForm()) {
      logger.warn('Form validation failed');
      return;
    }

    try {
      logger.info('Attempting user registration', {
        email: formData.email,
        username: formData.username
      });

      // Debug log before calling handleSignUp
      console.log('[DEBUG] Calling handleSignUp', { email: formData.email, username: formData.username });
      addDebug(`[ACTION] Calling handleSignUp for ${formData.email}`);
      
      await handleSignUp({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        transactionPin: formData.transactionPin,
        password: formData.password,
        // confirmPassword is validated locally but not sent to the API
        acceptTerms: formData.acceptTerms,
        referralUsername: formData.referralUsername || ''
      });
      
      logger.info('User registration successful', { email: formData.email });
      addDebug(`[SUCCESS] Registration completed for ${formData.email}`);
      
      // Redirect to email verification page
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (error: unknown) {
      console.error('[DEBUG] Registration failed', error);
      addDebug(`[ERROR] Registration failed: ${String(error)}`);
      logger.error('Registration failed', error, {
        email: formData.email,
        username: formData.username
      });
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Registration failed. Please try again.';
        
      setFormErrors(prev => ({
        ...prev,
        general: errorMessage
      }));
    }
  };

  const handleSocialRegister = async (provider: "google" | "apple") => {
    setIsSocialLoading(true);
    try {
      console.log(`Register with ${provider}`);
    } finally {
      setIsSocialLoading(false);
    }
  };

  // Attach capture-phase listeners to detect event interception
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const formEl = formRef.current;
    const btn = submitButtonRef.current;
    if (!formEl || !btn) return;

    const onFormSubmitCapture = (e: Event) => {
      addDebug('[CAPTURE] form submit captured');
      console.log('[CAPTURE] form submit captured', e);
    };

    const onFormSubmitBubble = (e: Event) => {
      addDebug('[BUBBLE] form submit bubbled');
      console.log('[BUBBLE] form submit bubbled', e);
    };

    const onBtnClickCapture = (e: Event) => {
      addDebug('[CAPTURE] register button click captured');
      console.log('[CAPTURE] register button click captured', e);
    };

    const onBtnClick = (e: Event) => {
      addDebug('[BUBBLE] register button click bubbled');
      console.log('[BUBBLE] register button click bubbled', e);
    };

    formEl.addEventListener('submit', onFormSubmitCapture, true);
    formEl.addEventListener('submit', onFormSubmitBubble, false);
    btn.addEventListener('click', onBtnClickCapture, true);
    btn.addEventListener('click', onBtnClick, false);

    return () => {
      formEl.removeEventListener('submit', onFormSubmitCapture, true);
      formEl.removeEventListener('submit', onFormSubmitBubble, false);
      btn.removeEventListener('click', onBtnClickCapture, true);
      btn.removeEventListener('click', onBtnClick, false);
    };
  }, [formRef.current, submitButtonRef.current]);

  return (
    <AuthLayout>
      <Card className="bg-card/90 border-border shadow-lg">
        <CardHeader className="space-y-1 pb-6">
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">VTU</span>
            </div>
            <span className="font-semibold text-foreground">OSGHub VTU</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-register-heading">
            Create account
          </h1>
          <p className="text-sm text-muted-foreground">
            Get started with your free account today
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {formErrors.general && (
            <div
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              role="alert"
              data-testid="text-register-error"
            >
              {formErrors.general}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Full Name | Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className={`h-12 bg-background border-${formErrors.fullName ? 'destructive' : 'border'}-200 focus:ring-ring`}
                  disabled={isLoading}
                  aria-describedby={formErrors.fullName ? "fullName-error" : undefined}
                  data-testid="input-full-name"
                />
                {formErrors.fullName && (
                  <p id="fullName-error" className="text-sm text-destructive" data-testid="text-fullname-error">
                    {formErrors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  id="username"
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className={`h-12 bg-background border-${formErrors.username ? 'destructive' : 'border'}-200 focus:ring-ring`}
                  disabled={isLoading}
                  aria-describedby={formErrors.username ? "username-error" : undefined}
                  data-testid="input-username"
                />
                {formErrors.username && (
                  <p id="username-error" className="text-sm text-destructive" data-testid="text-username-error">
                    {formErrors.username}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Referral Username (Optional) | Phone Number | Transaction Pin */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Input
                  id="referralUsername"
                  type="text"
                  placeholder="Referral Username (Optional)"
                  value={formData.referralUsername}
                  onChange={(e) =>
                    setFormData({ ...formData, referralUsername: e.target.value })
                  }
                  className="h-12 bg-background border-border focus:ring-ring"
                  disabled={isLoading}
                  data-testid="input-referral"
                />
              </div>

              <div className="space-y-2">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })
                  }
                  className={`h-12 bg-background border-${formErrors.phone ? 'destructive' : 'border'}-200 focus:ring-ring`}
                  disabled={isLoading}
                  maxLength={15}
                  aria-describedby={formErrors.phone ? "phone-error" : undefined}
                  data-testid="input-phone-number"
                />
                {formErrors.phone && (
                  <p id="phone-error" className="text-sm text-destructive" data-testid="text-phone-error">
                    {formErrors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="transactionPin"
                    type={showPin ? "text" : "password"}
                    placeholder="Transaction Pin"
                    value={formData.transactionPin}
                    onChange={(e) =>
                      setFormData({ ...formData, transactionPin: e.target.value.replace(/\D/g, '').slice(0, 6) })
                    }
                    className={`h-12 pr-11 bg-background border-${formErrors.transactionPin ? 'destructive' : 'border'}-200 focus:ring-ring`}
                    disabled={isLoading}
                    maxLength={6}
                    aria-describedby={formErrors.transactionPin ? "transactionPin-error" : undefined}
                    data-testid="input-transaction-pin"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  >
                    {showPin ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formErrors.transactionPin && (
                  <p id="transactionPin-error" className="text-sm text-destructive" data-testid="text-pin-error">
                    {formErrors.transactionPin}
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Email (Full Width) */}
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`h-12 bg-background border-${formErrors.email ? 'destructive' : 'border'}-200 focus:ring-ring`}
                disabled={isLoading}
                aria-describedby={formErrors.email ? "email-error" : undefined}
                data-testid="input-email"
              />
              {formErrors.email && (
                <p id="email-error" className="text-sm text-destructive" data-testid="text-email-error">
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Row 4: Password | Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={`h-12 pr-11 bg-background border-${formErrors.password ? 'destructive' : 'border'}-200 focus:ring-ring`}
                    disabled={isLoading}
                    aria-describedby={formErrors.password ? "password-error" : "password-requirements"}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p id="password-error" className="text-sm text-destructive" data-testid="text-password-error">
                    {formErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    className={`h-12 pr-11 bg-background border-${formErrors.confirmPassword ? 'destructive' : 'border'}-200 focus:ring-ring`}
                    disabled={isLoading}
                    aria-describedby={formErrors.confirmPassword ? "confirmPassword-error" : undefined}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {formErrors.confirmPassword && (
                  <p id="confirmPassword-error" className="text-sm text-destructive" data-testid="text-confirm-password-error">
                    {formErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            {formData.password && (
              <ul id="password-requirements" className="grid grid-cols-2 gap-1">
                {passwordRequirements.map((req, index) => {
                  const passed = req.test(formData.password);
                  return (
                    <li
                      key={index}
                      className={`flex items-center gap-2 text-xs ${
                        passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      {passed ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {req.label}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <div className="space-y-1">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="acceptTerms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, acceptTerms: checked as boolean })
                  }
                  disabled={isLoading}
                  className={`mt-0.5 ${formErrors.acceptTerms ? 'border-destructive' : ''}`}
                  data-testid="checkbox-accept-terms"
                />
                <Label
                  htmlFor="acceptTerms"
                  className="text-sm text-muted-foreground cursor-pointer leading-tight"
                >
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {formErrors.acceptTerms && (
                <p className="text-sm text-destructive" data-testid="text-terms-error">
                  {formErrors.acceptTerms}
                </p>
              )}
            </div>
            </div>

            <Button
              ref={submitButtonRef as any}
              type="submit"
              onClick={handleSubmit} // fallback in case native submit isn't firing
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12"
              onClick={() => handleSocialRegister("google")}
              disabled={isLoading}
              data-testid="button-google-register"
            >
              <SiGoogle className="w-4 h-4 mr-2" />
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12"
              onClick={() => handleSocialRegister("apple")}
              disabled={isLoading}
              data-testid="button-apple-register"
            >
              <SiApple className="w-4 h-4 mr-2" />
              Apple
            </Button>
          </div>

          {/* On-screen debug panel (visible when testing) */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setDebugVisible(v => !v)}
              className="text-sm text-muted-foreground hover:underline mr-3"
            >
              {debugVisible ? 'Hide debug panel' : `Show debug (${debugMessages.length})`}
            </button>

            {debugVisible && (
              <div className="mt-3 p-3 border rounded bg-gray-50 text-sm">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-muted-foreground">Debug logs (auto-captured)</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(debugMessages.join('\n')); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Copy logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setDebugMessages([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-auto">
                  {debugMessages.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No logs yet</div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-xs">{debugMessages.join('\n')}</pre>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
              data-testid="link-login"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
