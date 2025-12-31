'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyFunding, getWalletBalance } from '@/lib/services';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function PaymentCompleteContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState<string>('Verifying payment...');

  useEffect(() => {
    const run = async () => {
      const tx_ref = params.get('tx_ref') || params.get('transaction_id') || '';
      if (!tx_ref) {
        setStatus('failed');
        setMessage('Missing tx_ref');
        return;
      }
      const res = await verifyFunding(tx_ref);
      if (res.success) {
        setStatus('success');
        setMessage('Wallet credited successfully');
        await getWalletBalance(); // refresh cache/contexts if any
        setTimeout(() => router.replace('/dashboard/wallet'), 1500);
      } else {
        setStatus('failed');
        setMessage(res.message || 'Verification failed');
      }
    };
    run();
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin mx-auto text-[#0A1F44]" size={40} />
            <h1 className="text-xl font-semibold text-[#0A1F44]">Verifying Payment</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto text-green-600" size={40} />
            <h1 className="text-xl font-semibold text-[#0A1F44]">Payment Successful</h1>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to your wallet...</p>
          </>
        )}
        {status === 'failed' && (
          <>
            <XCircle className="mx-auto text-red-600" size={40} />
            <h1 className="text-xl font-semibold text-[#0A1F44]">Payment Verification Failed</h1>
            <p className="text-gray-600">{message}</p>
            <button
              className="mt-4 px-4 py-2 rounded-md bg-[#0A1F44] text-white"
              onClick={() => router.replace('/dashboard/wallet')}
            >
              Go to Wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
            <Loader2 className="animate-spin mx-auto text-[#0A1F44]" size={40} />
            <h1 className="text-xl font-semibold text-[#0A1F44]">Verifying Payment</h1>
            <p className="text-gray-600">Please wait...</p>
          </div>
        </div>
      }
    >
      <PaymentCompleteContent />
    </Suspense>
  );
}
