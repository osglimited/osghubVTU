'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, History, Send, Paperclip, 
  Image as ImageIcon, CheckCircle2, Check, CheckCheck,
  ChevronLeft, Plus, X, User, MessageSquare
} from 'lucide-react';
import { db, auth, storage } from '@/lib/firebase';
import { 
  collection, addDoc, query, where, getDocs, 
  orderBy, doc, runTransaction, onSnapshot, 
  serverTimestamp, updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ subject: '', message: '' });
  
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
    
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const ticketsRef = collection(db, 'tickets');
        const q = query(
          ticketsRef, 
          where('userId', '==', user.uid),
          orderBy('lastMessageAt', 'desc')
        );

        unsubscribe = onSnapshot(q, (snap) => {
          const ticketList = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((t: any) => !t.deleted);
          
          setTickets(ticketList);
          
          // Keep selected ticket updated
          if (selectedTicket) {
            const updated = ticketList.find(t => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
          }
        }, (error) => {
          console.error("Tickets snapshot error:", error);
        });
      } else {
        setTickets([]);
        unsubscribe();
      }
    });

    return () => {
      unsubAuth();
      unsubscribe();
    };
  }, [selectedTicket?.id]);

  // Real-time replies listener
  useEffect(() => {
    if (!selectedTicket || !selectedTicket.id) {
      setReplies([]);
      return;
    }

    const repliesRef = collection(db, 'tickets', selectedTicket.id, 'messages');
    const q = query(repliesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReplies(messages);
      
      // Mark admin messages as read
      const unreadAdminMessages = snap.docs.filter(d => d.data().sender === 'admin' && !d.data().read);
      unreadAdminMessages.forEach(d => {
        updateDoc(d.ref, { read: true }).catch(err => console.error("Error marking read:", err));
      });
    }, (error) => {
      console.error("Replies snapshot error:", error);
    });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || !auth.currentUser) return;
    
    if (selectedTicket.status === 'solved') {
      toast({ title: "Ticket Resolved", description: "This ticket is closed. Please reopen or create a new one.", type: "destructive" });
      return;
    }

    setSendingReply(true);
    try {
      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      const messagesRef = collection(ticketRef, 'messages');
      
      const messageObj = {
        text: replyMessage,
        sender: 'user',
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        createdAt: serverTimestamp(),
        read: false
      };
      
      await addDoc(messagesRef, messageObj);
      await updateDoc(ticketRef, { 
        status: 'open',
        lastMessage: replyMessage,
        lastMessageAt: serverTimestamp()
      });

      setReplyMessage('');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "destructive" });
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicketData.subject || !newTicketData.message || !auth.currentUser) return;
    
    setSubmitting(true);
    try {
      const ticketData = {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        subject: newTicketData.subject,
        lastMessage: newTicketData.message,
        status: 'open',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        deleted: false
      };
      
      const docRef = await addDoc(collection(db, 'tickets'), ticketData);
      
      // Add first message
      await addDoc(collection(db, 'tickets', docRef.id, 'messages'), {
        text: newTicketData.message,
        sender: 'user',
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        createdAt: serverTimestamp(),
        read: true
      });

      toast({ title: "Success", description: "Ticket created successfully" });
      setNewTicketData({ subject: '', message: '' });
      setShowNewTicket(false);
      setSelectedTicket({ id: docRef.id, ...ticketData });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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

      const messageObj = {
        text: "Sent an attachment",
        attachmentUrl: url,
        attachmentName: file.name,
        sender: 'user',
        senderId: auth.currentUser.uid,
        senderEmail: auth.currentUser.email,
        createdAt: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'tickets', selectedTicket.id, 'messages'), messageObj);
      await updateDoc(doc(db, 'tickets', selectedTicket.id), { 
        lastMessageAt: serverTimestamp(),
        lastMessage: "Sent an attachment",
        status: 'open'
      });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, type: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReopen = async () => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), { 
        status: 'open',
        lastMessageAt: serverTimestamp()
      });
      toast({ title: "Ticket Reopened" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, type: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-gray-50 overflow-hidden rounded-2xl border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b z-20">
        <div>
          <h1 className="text-xl font-black text-[#0A1F44] flex items-center gap-2">
             <MessageSquare className="w-6 h-6 text-[#F97316]" />
             SUPPORT CENTER
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time Assistance</p>
        </div>
        <Button 
          onClick={() => { setShowNewTicket(true); setSelectedTicket(null); }}
          className="bg-[#F97316] hover:bg-[#ea6d0f] font-black uppercase text-[10px] tracking-widest px-6 h-10 rounded-xl shadow-lg shadow-orange-100"
        >
          <Plus className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      <div className="flex flex-grow overflow-hidden relative">
        {/* Sidebar */}
        <div className={`w-full md:w-[350px] flex flex-col bg-white border-r transition-all duration-300 ${selectedTicket || showNewTicket ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-gray-50/50">
            <div className="relative">
              <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <div className="pl-9 pr-4 py-2 bg-white border rounded-xl text-xs font-bold text-gray-500 uppercase tracking-wider">
                Conversation History ({tickets.length})
              </div>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto p-2 space-y-1">
            {tickets.map((t) => (
              <div 
                key={t.id} 
                onClick={() => { setSelectedTicket(t); setShowNewTicket(false); }}
                className={`group p-5 rounded-3xl cursor-pointer transition-all duration-300 border-2 relative ${
                  selectedTicket?.id === t.id 
                    ? 'bg-white border-[#0A1F44] shadow-2xl shadow-blue-50 scale-[1.02] z-10' 
                    : 'bg-white border-transparent hover:border-gray-100'
                }`}
              >
                {t.status === 'open' && selectedTicket?.id !== t.id && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#F97316] animate-pulse" />
                )}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-gray-400 uppercase">ID: {t.id.slice(0,6)}</span>
                  <Badge className={`text-[9px] font-black h-5 uppercase px-2 border-none ${
                    t.status === 'open' ? 'bg-orange-500 text-white' : 
                    t.status === 'solved' ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'
                  }`}>
                    {t.status}
                  </Badge>
                </div>
                <h4 className="text-sm font-black text-[#0A1F44] truncate mb-1">{t.subject}</h4>
                <p className="text-xs text-gray-500 line-clamp-1 font-medium">{t.lastMessage}</p>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                  <span className="text-[10px] font-bold text-gray-300 uppercase">
                    {t.lastMessageAt?.seconds ? new Date(t.lastMessageAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">No History</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow flex flex-col bg-[#F8FAFC] overflow-hidden">
          {showNewTicket ? (
            <div className="flex-grow flex items-center justify-center p-6">
              <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-[#F97316]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#0A1F44] tracking-tight">OPEN NEW TICKET</h2>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">We're here to help</p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</Label>
                    <Input 
                      className="h-14 rounded-2xl border-2 border-gray-100 focus:border-[#F97316] font-bold" 
                      value={newTicketData.subject} 
                      onChange={e => setNewTicketData({...newTicketData, subject: e.target.value})} 
                      placeholder="What's the issue?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</Label>
                    <textarea 
                      className="w-full min-h-[120px] rounded-2xl border-2 border-gray-100 focus:border-[#F97316] p-4 font-medium text-sm resize-none" 
                      value={newTicketData.message} 
                      onChange={e => setNewTicketData({...newTicketData, message: e.target.value})} 
                      placeholder="Describe your problem in detail..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2" onClick={() => setShowNewTicket(false)}>Cancel</Button>
                    <Button 
                      className="flex-2 h-14 bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100" 
                      disabled={submitting || !newTicketData.subject || !newTicketData.message}
                      onClick={handleCreateTicket}
                    >
                      {submitting ? 'Creating...' : 'Launch Ticket'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="md:hidden rounded-full" onClick={() => setSelectedTicket(null)}>
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </Button>
                  <div className="h-10 w-10 rounded-2xl bg-[#0A1F44] flex items-center justify-center text-[#F97316]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#0A1F44] leading-tight uppercase tracking-tight">{selectedTicket.subject}</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ticket ID: {selectedTicket.id.slice(0,8)}</p>
                  </div>
                </div>
                {selectedTicket.status === 'solved' && (
                  <Button variant="outline" size="sm" onClick={handleReopen} className="h-8 border-2 border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl font-black text-[9px] px-4 uppercase tracking-wider">
                    Reopen Case
                  </Button>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-[#E5DDD5] relative scroll-smooth">
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />
                
                {replies.map((r, i) => (
                  <div key={r.id || i} className={`flex flex-col relative z-10 ${r.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`p-4 rounded-2xl shadow-sm max-w-[85%] md:max-w-[75%] relative ${
                      r.sender === 'user' 
                        ? 'bg-[#DCF8C6] text-gray-800 rounded-tr-none' 
                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    }`}>
                      <div className={`absolute top-0 w-3 h-3 ${
                        r.sender === 'user' 
                          ? 'right-[-8px] bg-[#DCF8C6] [clip-path:polygon(0_0,0_100%,100%_0)]' 
                          : 'left-[-8px] bg-white [clip-path:polygon(100%_0,0_0,100%_100%)]'
                      }`} />

                      <p className="text-sm font-medium leading-relaxed">{r.text}</p>
                      
                      {r.attachmentUrl && (
                        <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 p-2 bg-black/5 rounded-lg text-[10px] font-bold hover:bg-black/10 transition-colors">
                          <ImageIcon size={14} className="text-gray-500" />
                          <span className="truncate max-w-[150px]">{r.attachmentName || 'Attachment'}</span>
                        </a>
                      )}
                      
                      <div className="flex justify-end items-center gap-1.5 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-40">
                          {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                        {r.sender === 'user' && (
                          r.read ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t">
                {selectedTicket.status === 'solved' ? (
                  <div className="text-center py-2 px-4 bg-green-50 rounded-xl border border-green-100">
                    <p className="text-[10px] text-green-700 font-black uppercase tracking-widest">This ticket is resolved. Reopen to send a message.</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 max-w-4xl mx-auto">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-10 w-10 rounded-full text-gray-400 hover:text-[#F97316] hover:bg-gray-50"
                    >
                      <Paperclip size={20} />
                    </Button>
                    <div className="flex-grow relative">
                      <textarea
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:bg-white resize-none h-11 transition-all"
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
                      disabled={!replyMessage.trim() || sendingReply}
                      className="bg-[#0A1F44] hover:bg-[#0A1F44]/90 h-11 w-11 p-0 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-100"
                    >
                      <Send size={18} className="text-[#F97316]" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-gray-50">
                <MessageSquare className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-xl font-black text-[#0A1F44] uppercase tracking-tighter">SELECT A CONVERSATION</h3>
              <p className="text-xs max-w-[280px] text-gray-400 font-bold uppercase tracking-widest mt-2 leading-relaxed opacity-60">Choose a ticket from the sidebar or open a new one to start chatting with our support team.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
