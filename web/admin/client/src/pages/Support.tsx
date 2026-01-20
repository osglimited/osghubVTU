import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Megaphone, Trash2, Send, History, CheckCheck, Check, User, ShieldCheck, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAnnouncements, createAnnouncement, deleteAnnouncement, db } from "@/lib/backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAnnouncement, setOpenAnnouncement] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info' });
  const [replies, setReplies] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  const loadData = async () => {
    setLoading(true);
    try {
      const anns = await getAnnouncements();
      setAnnouncements(anns || []);
    } catch (e: any) {
      console.error("Load announcements error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!db) {
      console.error("Firebase DB is not initialized");
      return;
    }
    
    try {
      const ticketsRef = collection(db, 'support_tickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snap: any) => {
        const ticketList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setTickets(ticketList);
        
        if (selectedTicket) {
          const updated = ticketList.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }, (err: any) => {
        console.error("Tickets listener error:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to setup tickets listener:", e);
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!selectedTicket || !db) {
      setReplies([]);
      return;
    }

    try {
      const repliesRef = collection(db, 'support_tickets', selectedTicket.id, 'replies');
      const q = query(repliesRef, orderBy('createdAt', 'asc'));
      
      const unsubscribe = onSnapshot(q, (snap: any) => {
        const replyList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setReplies(replyList);
        
        const unreadReplies = snap.docs.filter((d: any) => d.data().senderRole === 'user' && !d.data().read);
        unreadReplies.forEach((d: any) => {
          updateDoc(d.ref, { read: true }).catch((e: any) => console.error("Update read status error:", e));
        });
      }, (err: any) => {
        console.error("Replies listener error:", err);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to setup replies listener:", e);
    }
  }, [selectedTicket?.id]);

  useEffect(() => { loadData(); }, []);

  const handleReply = async (id: string) => {
    if (!replyMsg.trim()) return;
    try {
      const ticketRef = doc(db, 'support_tickets', id);
      const replyRef = collection(ticketRef, 'replies');
      
      await addDoc(replyRef, reply);
      await updateDoc(ticketRef, { 
        status: 'replied',
        updatedAt: Date.now(),
        lastMessageAt: Date.now()
      });

      toast({ title: "Success", description: "Reply sent" });
      setReplyMsg('');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const markAsSolved = async (id: string) => {
    try {
      const ticketRef = doc(db, 'support_tickets', id);
      await updateDoc(ticketRef, { 
        status: 'solved', 
        updatedAt: Date.now(),
        lastMessageAt: Date.now()
      });
      toast({ title: "Ticket Marked as Solved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreateAnn = async () => {
    if (!newAnn.title || !newAnn.content) return;
    try {
      await createAnnouncement(newAnn);
      toast({ title: "Success", description: "Announcement posted" });
      setOpenAnnouncement(false);
      setNewAnn({ title: '', content: '', type: 'info' });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteAnn = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      toast({ title: "Success", description: "Announcement deleted" });
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b shadow-sm z-20">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
             <ShieldCheck className="w-6 h-6 text-blue-600" />
             ADMIN SUPPORT
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time Customer Relations</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none px-3 py-1 font-bold text-[10px]">
            {tickets.filter(t => t.status === 'open').length} ACTIVE TICKETS
          </Badge>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden relative">
        {/* Left Sidebar - Ticket List */}
        <div className={`w-full md:w-[380px] flex flex-col bg-white border-r z-10 transition-all duration-300 ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b bg-gray-50/50">
            <div className="relative">
              <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <div className="pl-9 pr-4 py-2 bg-white border rounded-xl text-xs font-bold text-gray-500 uppercase tracking-wider">
                Conversation History
              </div>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto scrollbar-hide p-2 space-y-1">
            {tickets.map((t) => (
              <div 
                key={t.id} 
                onClick={() => setSelectedTicket(t)}
                className={`group p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                  selectedTicket?.id === t.id 
                    ? 'bg-blue-50 border-blue-600 shadow-md shadow-blue-100' 
                    : 'bg-white border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter truncate max-w-[140px]">{t.userEmail}</span>
                  <Badge className={`text-[9px] font-black h-5 uppercase px-2 border-none ${
                    t.status === 'open' ? 'bg-red-500 text-white' : 
                    t.status === 'replied' ? 'bg-blue-500 text-white' : 
                    'bg-gray-400 text-white'
                  }`}>
                    {t.status}
                  </Badge>
                </div>
                <h4 className="text-sm font-bold text-gray-900 truncate mb-1">{t.subject || "Untitled Query"}</h4>
                <p className="text-xs text-gray-400 line-clamp-1 font-medium">{t.message}</p>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase">
                    {new Date(t.lastMessageAt || t.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                  {t.lastMessageAt && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">No Active Conversations</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50/50">
            <Dialog open={openAnnouncement} onOpenChange={setOpenAnnouncement}>
              <DialogTrigger asChild>
                <Button className="w-full h-12 bg-gray-900 hover:bg-black text-white font-black rounded-2xl shadow-xl shadow-gray-200 uppercase tracking-widest text-[11px] gap-2">
                  <Megaphone className="w-4 h-4" /> Broadcast Update
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-none shadow-2xl p-8">
                <DialogHeader><DialogTitle className="text-2xl font-black text-gray-900">SYSTEM BROADCAST</DialogTitle></DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Announcement Title</Label>
                    <Input className="h-14 rounded-2xl border-2 border-gray-100 focus:border-blue-600 transition-all font-bold text-gray-900" value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} placeholder="e.g. Maintenance Scheduled" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Body</Label>
                    <Textarea className="min-h-[160px] rounded-2xl border-2 border-gray-100 focus:border-blue-600 transition-all font-medium text-gray-800 resize-none p-4" value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} placeholder="What's the update?" />
                  </div>
                  <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest mt-2" onClick={handleCreateAnn}>PUBLISH TO USERS</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Right Area - Chat Content */}
        <div className={`flex-grow flex flex-col bg-gray-50 overflow-hidden transition-all duration-300 ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="md:hidden rounded-full hover:bg-gray-100" onClick={() => setSelectedTicket(null)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </Button>
                  <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 leading-tight">{selectedTicket.subject}</h3>
                    <p className="text-[11px] font-bold text-blue-600 truncate max-w-[200px]">{selectedTicket.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedTicket.status !== 'solved' && (
                    <Button variant="outline" size="sm" onClick={() => markAsSolved(selectedTicket.id)} className="h-9 border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-xl font-black text-[10px] px-4 uppercase tracking-wider">
                      Mark Resolved
                    </Button>
                  )}
                  <div className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-black text-gray-400 uppercase">
                    ID: {selectedTicket.id.slice(0, 8)}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#f0f2f5] pattern-dots relative scroll-smooth">
                {/* Initial Ticket Message */}
                <div className="flex flex-col items-start max-w-[85%] md:max-w-[70%]">
                  <div className="bg-white p-5 rounded-3xl rounded-tl-none shadow-sm border border-gray-100">
                    <div className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest border-b pb-1">Original Request</div>
                    <p className="text-sm font-medium text-gray-800 leading-relaxed">{selectedTicket.message}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        {selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleTimeString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>

                {replies.map((r, i) => (
                  <div key={r.id || i} className={`flex flex-col ${r.senderRole === 'admin' ? 'items-end ml-auto' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                    <div className={`p-4 rounded-3xl shadow-md ${
                      r.senderRole === 'admin' 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100 border-b-4 border-blue-700' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="text-sm font-medium leading-relaxed">{r.message}</p>
                      <div className="flex justify-end items-center gap-2 mt-2 opacity-70">
                        <span className="text-[9px] font-bold uppercase tracking-widest">
                          {r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : 'Just now'}
                        </span>
                        {r.senderRole === 'admin' && (
                          r.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                    <div className={`mt-1 text-[8px] font-black uppercase tracking-tighter ${r.senderRole === 'admin' ? 'text-blue-400 mr-2' : 'text-gray-400 ml-2'}`}>
                      {r.senderRole === 'admin' ? 'Support Team' : 'User Response'}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-white border-t z-10">
                <div className="relative group max-w-4xl mx-auto">
                  <Textarea 
                    placeholder="Type a professional response..." 
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    className="min-h-[100px] bg-gray-50 border-2 border-gray-100 focus:border-blue-600 focus:bg-white rounded-3xl text-sm font-medium p-5 pr-16 transition-all resize-none shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply(selectedTicket.id);
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    onClick={() => handleReply(selectedTicket.id)} 
                    disabled={!replyMsg.trim()} 
                    className="absolute bottom-4 right-4 h-12 w-12 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center group-hover:scale-105"
                  >
                    <Send className="h-5 w-5 text-white" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-center gap-4">
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Shift + Enter for New Line</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Automatic Read Tracking</span>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-[#f8f9fa]">
              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse" />
                 <div className="relative h-32 w-32 rounded-[40px] bg-white border-4 border-white shadow-2xl flex items-center justify-center rotate-6 hover:rotate-0 transition-transform duration-500">
                    <MessageSquare className="h-14 w-14 text-blue-600 opacity-20" />
                 </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tighter">Support Terminal Active</h3>
              <p className="text-xs max-w-[320px] leading-relaxed text-gray-500 font-bold uppercase tracking-widest opacity-60">Select a conversation from the sidebar to begin secure communication with the customer.</p>
              
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl w-full">
                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                       <History className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instant History</span>
                 </div>
                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                       <CheckCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Read Receipts</span>
                 </div>
                 <div className="p-6 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                       <Megaphone className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Broadcast</span>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
