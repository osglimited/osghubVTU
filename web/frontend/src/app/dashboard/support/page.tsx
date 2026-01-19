'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/components/ui/toast';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, 'support_tickets'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const ticketList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTickets(ticketList);
      
      // Update selected ticket if it exists to show new messages
      if (selectedTicket) {
        const updated = ticketList.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReply = async () => {
    if (!auth.currentUser || !replyMessage || !selectedTicket) return;
    setSendingReply(true);
    try {
      const reply = {
        message: replyMessage,
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        senderRole: 'user',
        createdAt: Date.now(),
      };

      // Add to subcollection
      await addDoc(collection(db, 'support_tickets', selectedTicket.id, 'replies'), reply);
      
      // Update parent ticket status
      await runTransaction(db, async (transaction) => {
        const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
        transaction.update(ticketRef, { 
          status: 'open',
          updatedAt: Date.now()
        });
      });

      setReplyMessage('');
      await loadTickets();
      toast({ title: "Reply Sent", description: "Support team will review your message." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  // Poll for updates when a ticket is open
  useEffect(() => {
    let interval: any;
    if (selectedTicket) {
      interval = setInterval(loadTickets, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  const [replies, setReplies] = useState<any[]>([]);
  useEffect(() => {
    const loadReplies = async () => {
      if (!selectedTicket) return;
      const q = query(
        collection(db, 'support_tickets', selectedTicket.id, 'replies'),
        orderBy('createdAt', 'asc')
      );
      const snap = await getDocs(q);
      setReplies(snap.docs.map(d => d.data()));
    };
    loadReplies();
    const interval = setInterval(loadReplies, 5000);
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {tickets.map((t) => (
                <div 
                  key={t.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedTicket?.id === t.id ? 'border-[#F97316] bg-[#F97316]/5' : 'hover:border-gray-300'}`}
                  onClick={() => setSelectedTicket(t)}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold truncate max-w-[120px]">{t.subject}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="md:col-span-2 bg-gray-50 rounded-lg p-4 flex flex-col min-h-[400px]">
              {selectedTicket ? (
                <>
                  <div className="border-b pb-3 mb-4 flex justify-between items-center">
                    <h3 className="font-bold text-[#0A1F44]">{selectedTicket.subject}</h3>
                    <span className="text-xs text-gray-500">ID: {selectedTicket.id.slice(0,8)}</span>
                  </div>

                  <div className="flex-grow space-y-4 overflow-y-auto max-h-[400px] mb-4 p-2">
                    {/* Initial Message */}
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <p className="text-sm">{selectedTicket.message}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {new Date(selectedTicket.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Replies */}
                    {replies.map((r, i) => (
                      <div key={i} className={`flex flex-col ${r.senderRole === 'user' ? 'items-end' : 'items-start'} max-w-[80%] ${r.senderRole === 'user' ? 'ml-auto' : ''}`}>
                        <div className={`p-3 rounded-lg border shadow-sm ${r.senderRole === 'user' ? 'bg-[#F97316] text-white border-[#F97316]' : 'bg-white text-gray-800 border-gray-200'}`}>
                          <p className="text-sm">{r.message}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">
                          {r.senderRole === 'admin' ? 'Support Team • ' : ''}
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-auto pt-4 border-t space-y-3">
                    <textarea
                      className="w-full rounded-md border border-gray-200 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                      placeholder="Type your reply here..."
                      rows={2}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button 
                        size="sm"
                        className="bg-[#0A1F44] hover:bg-[#0A1F44]/90"
                        disabled={!replyMessage || sendingReply}
                        onClick={handleReply}
                      >
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p>Select a ticket to view conversation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
