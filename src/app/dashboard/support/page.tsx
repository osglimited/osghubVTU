'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import DashboardGuard from '@/components/dashboard/DashboardGuard';
import { LifeBuoy, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export default function SupportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const canSubmit = !!user && subject.trim().length > 3 && message.trim().length > 10;

  const onSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: user.uid,
        subject,
        message,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdAtServer: serverTimestamp(),
      });
      setSubject('');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGuard>
      <DashboardLayout>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
            <LifeBuoy size={40} className="text-[#F97316]" />
            Support
          </h1>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
            <p className="text-gray-600">
              Submit a support ticket and our team will reach out to you via your account email.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                className="input-field w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly describe your issue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                className="input-field w-full h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Provide details to help us assist you faster"
              />
            </div>
            <button
              className="btn-accent w-full flex items-center justify-center gap-2"
              disabled={!canSubmit || loading}
              onClick={onSubmit}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Submit Ticket
            </button>
            <div className="text-sm text-gray-500">
              You can also reach out on our official channels if available.
            </div>
          </div>
        </div>
      </DashboardLayout>
    </DashboardGuard>
  );
}
