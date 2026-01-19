'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useToast } from '@/components/ui/toast';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const { toast } = useToast();

  const loadTickets = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const handleSubmit = async () => {
    if (!auth.currentUser || !subject || !message) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'support_tickets'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        subject,
        message,
        status: 'open',
        createdAt: Date.now(),
      });
      toast({ title: "Ticket Submitted", description: "We'll get back to you soon." });
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#0A1F44]">Support</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[#0A1F44]">Contact Support</h2>
          <p className="text-sm text-gray-500">Describe your issue and we’ll get back to you.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[#0A1F44]">Subject</Label>
            <Input
              className="mt-2"
              placeholder="Brief summary of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[#0A1F44]">Message</Label>
            <textarea
              className="w-full rounded-md border border-gray-200 p-3 mt-2 h-40 resize-y focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
              placeholder="Provide details to help us resolve your issue"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            className="bg-[#F97316] hover:bg-[#ea6d0f]" 
            disabled={!subject || !message || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-[#0A1F44] mb-4">Your Tickets</h2>
          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">{t.subject}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'open' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{t.message}</p>
                {t.adminReply && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-[#F97316]">
                    <p className="text-xs font-bold text-[#0A1F44]">Admin Reply:</p>
                    <p className="text-sm text-gray-700">{t.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
