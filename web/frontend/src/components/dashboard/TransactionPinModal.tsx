'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { generateHash } from '@/lib/crypto';
import { X, Lock } from 'lucide-react';

interface TransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionPinModal({ isOpen, onClose, onSuccess }: TransactionPinModalProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 4) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const hashedPin = await generateHash(pin);
      
      // In a real app, you might want to verify this on the server
      // But for this client-side logic with Firebase:
      if (user?.pinHash === hashedPin) {
        onSuccess();
        onClose();
        setPin('');
      } else {
        setError('Incorrect PIN');
      }
    } catch (err) {
      console.error('PIN verification failed', err);
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Lock size={18} className="text-[#F97316]" />
            Confirm Transaction
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">
            Please enter your 4-digit transaction PIN to complete this purchase.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  setError('');
                }}
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                placeholder="••••"
                autoFocus
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-500 text-center font-medium">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="flex-1 px-4 py-2 bg-[#0A1F44] text-white rounded-lg hover:bg-[#0A1F44]/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
