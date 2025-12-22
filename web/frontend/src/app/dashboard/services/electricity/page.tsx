'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useService } from '@/hooks/useServices';
import { processTransaction } from '@/lib/services';
import TransactionPinModal from '@/components/dashboard/TransactionPinModal';
import { useNotifications } from '@/contexts/NotificationContext';

export default function ElectricityPage() {
  const { user, refreshUser } = useAuth();
  const { service, loading, error } = useService('electricity');
  const { addNotification } = useNotifications();
  
  const [provider, setProvider] = useState('ikedc');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (user.walletBalance < Number(amount)) {
      addNotification('warning', 'Insufficient wallet balance', 'Top up your wallet to continue');
      return;
    }

    setShowPinModal(true);
  };

  const onPinSuccess = async () => {
    if (!user || !service) return;
    setProcessing(true);
    try {
      const result = await processTransaction(
        user.uid,
        Number(amount),
        'electricity',
        { provider, meterNumber, serviceName: service.name }
      );
      
      if (result.success) {
        addNotification('success', 'Electricity payment successful', `₦${Number(amount).toLocaleString()} to ${provider.toUpperCase()}`);
        setMeterNumber('');
        setAmount('');
        refreshUser();
      } else {
        addNotification('error', 'Transaction failed', result.message);
      }
    } catch (err: any) {
      addNotification('error', 'Error', err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading service...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!service) return <div className="p-8 text-center">Service not available</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-[#0A1F44] mb-6 flex items-center gap-3">
        <div className="p-3 bg-orange-100 rounded-lg">
          <Zap className="text-orange-600" size={24} />
        </div>
        Electricity Bill
      </h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            Wallet Balance: <span className="font-bold">₦{user?.walletBalance.toLocaleString()}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Disco</label>
            <select 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
            >
              <option value="ikedc">Ikeja Electric (IKEDC)</option>
              <option value="ekedc">Eko Electric (EKEDC)</option>
              <option value="aedc">Abuja Electric (AEDC)</option>
              <option value="ibedc">Ibadan Electric (IBEDC)</option>
              <option value="kano">Kano Electric (KEDCO)</option>
              <option value="ph">Port Harcourt Electric (PHED)</option>
              <option value="jos">Jos Electric (JED)</option>
              <option value="kaduna">Kaduna Electric (KAEDCO)</option>
              <option value="enugu">Enugu Electric (EEDC)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meter Number</label>
            <input 
              type="text" 
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              placeholder="Enter meter number"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="100"
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44]"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={!service.enabled || processing}
            className="w-full py-3 px-4 bg-[#0A1F44] text-white rounded-lg font-medium hover:bg-[#0A1F44]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Pay Bill'}
          </button>
        </form>
      </div>

      <TransactionPinModal 
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={onPinSuccess}
      />
    </div>
  );
}
