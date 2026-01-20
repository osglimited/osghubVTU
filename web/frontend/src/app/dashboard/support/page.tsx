'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { Smartphone, Wifi, Tv, Zap, CreditCard, GraduationCap, Eye, EyeOff, ChevronLeft, ChevronRight, Pause, Play, Megaphone, Send, Image as ImageIcon, Paperclip, CheckCircle2, History, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, runTransaction, onSnapshot, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/components/ui/toast';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  // Real-time tickets listener
  useEffect(() => {
    let unsubscribe = () => {};
    
    const initListener = () => {
      if (!auth.currentUser) return;
      
      try {
        const q = query(
          collection(db, 'support_tickets'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(q, (snap) => {
          const ticketList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setTickets(ticketList);
          
          if (selectedTicket) {
            const updated = ticketList.find(t => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
          } else if (ticketList.length > 0 && !showNewTicket) {
            setSelectedTicket(ticketList[0]);
          }
        }, (error) => {
          console.error("Tickets snapshot error:", error);
          if (error.code !== 'permission-denied') {
            toast({ title: "Sync Error", description: "Could not load tickets.", type: "destructive" });
          }
        });
      } catch (error: any) {
        console.error("Tickets listener error:", error);
      }
    };

    // Wait for auth to be initialized
    const checkAuth = setInterval(() => {
      if (auth.currentUser) {
        initListener();
        clearInterval(checkAuth);
      }
    }, 500);

    return () => {
      clearInterval(checkAuth);
      unsubscribe();
    };
  }, [auth.currentUser?.uid]);

  // Real-time replies listener
  useEffect(() => {
    if (!selectedTicket) {
      setReplies([]);
      return;
    }

    const q = query(
      collection(db, 'support_tickets', selectedTicket.id, 'replies'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      // Mark as read when user views admin replies
      const unreadAdminReplies = snap.docs.filter(d => d.data().senderRole === 'admin' && !d.data().read);
      unreadAdminReplies.forEach(d => {
        runTransaction(db, async (transaction) => {
          transaction.update(d.ref, { read: true });
        });
      });
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTicket || !auth.currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 5MB", type: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `support/${selectedTicket.id}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const reply = {
        message: "Sent an attachment",
        attachmentUrl: url,
        attachmentName: file.name,
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        senderRole: 'user',
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'support_tickets', selectedTicket.id, 'replies'), reply);
      await runTransaction(db, async (transaction) => {
        transaction.update(doc(db, 'support_tickets', selectedTicket.id), { 
          lastMessageAt: Date.now(),
          updatedAt: Date.now(),
          status: 'open'
        });
      });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, type: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReply = async () => {
    if (!auth.currentUser || !replyMessage || !selectedTicket) return;
    if (selectedTicket.status === 'solved' || selectedTicket.status === 'closed') {
      toast({ title: "Ticket Locked", description: "Please reopen the ticket to reply.", type: "destructive" });
      return;
    }

    setSendingReply(true);
    try {
      const reply = {
        message: replyMessage,
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        senderRole: 'user',
        createdAt: Date.now(),
        read: false
      };

      await addDoc(collection(db, 'support_tickets', selectedTicket.id, 'replies'), reply);
      await runTransaction(db, async (transaction) => {
        transaction.update(doc(db, 'support_tickets', selectedTicket.id), { 
          status: 'open',
          updatedAt: Date.now(),
          lastMessageAt: Date.now()
        });
      });

      setReplyMessage('');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedTicket) return;
    try {
      await runTransaction(db, async (transaction) => {
        transaction.update(doc(db, 'support_tickets', selectedTicket.id), { 
          status: 'open',
          updatedAt: Date.now(),
          lastMessageAt: Date.now()
        });
      });
      toast({ title: "Ticket Reopened", type: "default" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser || !subject || !message) return;
    setSubmitting(true);
    try {
      const ticketData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        subject,
        message,
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastMessageAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'support_tickets'), ticketData);
      
      // Also add the first message as a reply to maintain history structure
      await addDoc(collection(db, 'support_tickets', docRef.id, 'replies'), {
        message: message,
        senderRole: 'user',
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        createdAt: Date.now(),
        read: true
      });

      toast({ title: "Ticket Submitted", description: "We'll get back to you soon.", type: "default" });
      setSubject('');
      setMessage('');
      setShowNewTicket(false);
      setSelectedTicket({ id: docRef.id, ...ticketData });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0A1F44] flex items-center gap-2">
          <MessageCircle className="text-[#F97316]" /> Support Center
        </h1>
        <Button 
          onClick={() => { setShowNewTicket(true); setSelectedTicket(null); }}
          className="bg-[#F97316] hover:bg-[#ea6d0f]"
          size="sm"
        >
          New Ticket
        </Button>
      </div>

      <div className="flex-grow flex gap-4 overflow-hidden">
        {/* Ticket List / History Sidebar */}
        <div className="w-full md:w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <span className="font-bold text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> History
            </span>
            <span className="text-[10px] bg-[#F97316]/10 text-[#F97316] px-2 py-0.5 rounded-full font-bold">
              {tickets.length} Total
            </span>
          </div>
          <div className="flex-grow overflow-y-auto p-2 space-y-2">
            {tickets.length === 0 && !showNewTicket ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                  <MessageCircle className="text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">No support history yet</p>
              </div>
            ) : tickets.map((t) => (
              <div 
                key={t.id} 
                onClick={() => { setSelectedTicket(t); setShowNewTicket(false); }}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedTicket?.id === t.id 
                    ? 'bg-[#0A1F44] border-[#0A1F44] text-white shadow-md' 
                    : 'bg-white border-transparent hover:border-gray-200 text-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-bold truncate max-w-[140px]">{t.subject}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase font-bold ${
                    t.status === 'open' ? 'bg-orange-500 text-white' : 
                    t.status === 'solved' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className={`text-xs line-clamp-1 ${selectedTicket?.id === t.id ? 'text-blue-100' : 'text-gray-400'}`}>
                  {t.message}
                </p>
                  <div className="flex justify-between items-center mt-2">
                  <span className={`text-[10px] ${selectedTicket?.id === t.id ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(t.lastMessageAt || t.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat / New Ticket Area */}
        <div className="flex-grow flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          {showNewTicket ? (
            <div className="p-8 max-w-2xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-[#0A1F44]">Open a Support Ticket</h2>
                <p className="text-sm text-gray-500">We'll respond as soon as possible.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <textarea 
                    className="w-full h-40 p-4 border rounded-xl focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] outline-none transition-all"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your issue..."
                  />
                </div>
                <Button 
                  onClick={handleSubmit} 
                  disabled={submitting || !subject || !message}
                  className="w-full bg-[#F97316] hover:bg-[#ea6d0f] h-12 rounded-xl text-lg font-bold"
                >
                  {submitting ? 'Submitting...' : 'Send Message'}
                </Button>
              </div>
            </div>
          ) : selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0A1F44] rounded-full flex items-center justify-center text-[#F97316]">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0A1F44] leading-tight">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">ID: {selectedTicket.id.slice(0,8)}</span>
                      {selectedTicket.status === 'solved' && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                          <CheckCircle2 size={10} /> Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedTicket.status === 'solved' && (
                  <Button variant="outline" size="sm" onClick={handleReopen} className="text-xs border-[#F97316] text-[#F97316] hover:bg-[#F97316]/10">
                    Reopen Case
                  </Button>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#F8FAFC]">
                {/* User's Original Message */}
                <div className="flex flex-col items-start">
                  <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                    <p className="text-sm text-gray-800">{selectedTicket.message}</p>
                  </div>
                  <span className="text-[9px] text-gray-400 mt-1 px-1">
                    {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : 'Just now'}
                  </span>
                </div>

                {replies.map((r, i) => (
                  <div key={r.id || i} className={`flex flex-col ${r.senderRole === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl shadow-sm max-w-[85%] ${
                      r.senderRole === 'user' 
                        ? 'bg-[#F97316] text-white rounded-tr-none' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="text-sm">{r.message}</p>
                      {r.attachmentUrl && (
                        <div className="mt-2">
                          <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-black/10 rounded-lg text-xs hover:bg-black/20 transition-colors">
                            <ImageIcon size={14} /> View Attachment
                          </a>
                        </div>
                      )}
                      {r.senderRole === 'user' && (
                        <div className="flex justify-end mt-1">
                          {r.read ? <CheckCheck size={12} className="opacity-80" /> : <Check size={12} className="opacity-80" />}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1 px-1">
                      {r.senderRole === 'admin' ? 'Support Team • ' : ''}
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t space-y-3">
                {selectedTicket.status === 'solved' ? (
                  <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs text-green-700 font-medium">This ticket has been marked as resolved.</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="text-gray-400 hover:text-[#F97316] h-10 w-10 rounded-full"
                    >
                      <Paperclip size={20} />
                    </Button>
                    <div className="flex-grow relative">
                      <textarea
                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-2 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316] resize-none h-10 transition-all focus:bg-white"
                        placeholder="Type your message..."
                        rows={1}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleReply();
                          }
                        }}
                      />
                    </div>
                    <Button 
                      onClick={handleReply}
                      disabled={!replyMessage || sendingReply}
                      className="bg-[#0A1F44] hover:bg-[#0A1F44]/90 h-10 w-10 p-0 rounded-full flex items-center justify-center flex-shrink-0"
                    >
                      <Send size={18} className="text-[#F97316]" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-[#F8FAFC]">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle size={40} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-[#0A1F44]">Support Chat</h3>
              <p className="text-sm max-w-[250px] text-center mt-1">Select a conversation to start chatting with our support team.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
