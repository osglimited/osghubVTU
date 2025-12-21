'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function Verify() {
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'phone' | null>(null);

  const handleEmailVerification = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast.success('Verification email sent!');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePhoneVerification = async () => {
    try {
      toast.success('Phone verification coming soon');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-[#0A1F44] mb-4">Verify Your Account</h1>
          <p className="text-gray-600 mb-8">Choose a verification method</p>

          {!verifyMethod ? (
            <div className="space-y-4">
              <button
                onClick={() => setVerifyMethod('email')}
                className="btn-primary w-full"
              >
                Verify with Email
              </button>
              <button
                onClick={() => setVerifyMethod('phone')}
                className="btn-secondary w-full"
              >
                Verify with Phone
              </button>
            </div>
          ) : (
            <>
              {verifyMethod === 'email' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Check your email for verification link</p>
                  <button onClick={handleEmailVerification} className="btn-accent w-full">
                    Resend Verification Email
                  </button>
                </div>
              )}
              {verifyMethod === 'phone' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Enter OTP sent to your phone</p>
                  <button onClick={handlePhoneVerification} className="btn-accent w-full">
                    Send OTP
                  </button>
                </div>
              )}
              <button
                onClick={() => setVerifyMethod(null)}
                className="btn-secondary w-full mt-4"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
