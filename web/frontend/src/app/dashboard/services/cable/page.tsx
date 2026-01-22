'use client';

import { useState } from 'react';
import { Tv } from 'lucide-react';
import { useService } from '@/hooks/useServices';
import { useAuth } from '@/contexts/AuthContext';
import { processTransaction } from '@/lib/services';
import TransactionPinModal from '@/components/dashboard/TransactionPinModal';

const CABLE_PROVIDERS = ['DSTV', 'GOTV', 'Startimes'];

export default function CablePage() {
  const { user } = useAuth();
  const { service, loading, error } = useService('tv');
  const [provider, setProvider] = useState(CABLE_PROVIDERS[0]);
  const [smartcardNumber, setSmartcardNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartcardNumber || !amount) return;
    setShowPinModal(true);
  };

  const onPinSuccess = async () => {
    if (!user || !service) return;
    
    setProcessing(true);
    try {
      const result = await processTransaction(
        user.uid,
        Number(amount),
        'cable',
        {
          provider,
          smartcardNumber,
          serviceProvider: service.slug
        }
      );

      if (result.success) {
        setResultModal({
          open: true,
          status: 'success',
          title: 'Subscription Successful',
          message: 'Cable subscription successful!',
          transactionId: result.transactionId,
          smsInfo: result.smsInfo
        });
        setSmartcardNumber('');
        setAmount('');
      } else {
        setResultModal({
          open: true,
          status: 'error',
          title: 'Transaction Failed',
          message: `Transaction failed: ${result.message}`,
          transactionId: result.transactionId
        });
      }
    } catch (err: any) {
      setResultModal({
        open: true,
        status: 'error',
        title: 'Error',
        message: `Error: ${err.message}`,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="card text-center py-12">Loading service...</div>
          ) : error ? (
            <div className="card text-center py-12 text-destructive">Error loading service: {error}</div>
          ) : !service ? (
            <div className="card text-center py-12">Service not available</div>
          ) : (
            <>
              <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
                <Tv size={40} className="text-[#F97316]" />
                {service.name}
              </h1>
              <p className="text-gray-600 text-lg mb-8">{service.description || 'Subscribe to your favorite cable TV channels.'}</p>

              <form onSubmit={handlePurchase} className="card space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Provider</label>
                  <select 
                    className="input-field"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                  >
                    {CABLE_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smartcard / IUC Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter number" 
                    className="input-field"
                    value={smartcardNumber}
                    onChange={(e) => setSmartcardNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    minLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
                  <input 
                    type="number" 
                    className="input-field"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1000"
                    required
                    placeholder="Plan amount"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter plan amount (e.g. 3500)</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center text-sm text-blue-900">
                    <span>Wallet Balance:</span>
                    <span className="font-bold">₦{user?.walletBalance?.toLocaleString() ?? '0.00'}</span>
                </div>

                <button 
                    type="submit" 
                    className="btn-accent w-full" 
                    disabled={!service.enabled || processing}
                >
                  {processing ? 'Processing...' : service.enabled ? 'Subscribe' : 'Coming soon'}
                </button>
              </form>
            </>
          )}

          <TransactionPinModal 
            isOpen={showPinModal} 
            onClose={() => setShowPinModal(false)} 
            onSuccess={onPinSuccess}
          />
        </div>
  );
}
