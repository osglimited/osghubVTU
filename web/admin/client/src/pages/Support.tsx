import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
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
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, orderBy('lastMessageAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snap: any) => {
        const ticketList = snap.docs.filter((d: any) => !d.data().deleted).map((d: any) => ({ id: d.id, ...d.data() }));
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
      const repliesRef = collection(db, 'tickets', selectedTicket.id, 'messages');
      const q = query(repliesRef, orderBy('createdAt', 'asc'));
      
      const unsubscribe = onSnapshot(q, (snap: any) => {
        const replyList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setReplies(replyList);
        
        const unreadReplies = snap.docs.filter((d: any) => d.data().sender === 'user' && !d.data().read);
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
      const ticketRef = doc(db, 'tickets', id);
      const replyRef = collection(ticketRef, 'messages');
      
      const replyObj = {
        text: replyMsg,
        sender: 'admin',
        createdAt: serverTimestamp(),
        read: false
      };
      
      await addDoc(replyRef, replyObj);
      await updateDoc(ticketRef, { 
        status: 'open',
        lastMessage: replyMsg,
        lastMessageAt: serverTimestamp()
      });

      toast({ title: "Success", description: "Reply sent" });
      setReplyMsg('');
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const markAsSolved = async (id: string) => {
    try {
      const ticketRef = doc(db, 'tickets', id);
      await updateDoc(ticketRef, { 
        status: 'solved', 
        lastMessageAt: serverTimestamp()
      });
      toast({ title: "Ticket Marked as Solved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    try {
      const ticketRef = doc(db, 'tickets', id);
      await updateDoc(ticketRef, { deleted: true });
      setSelectedTicket(null);
      toast({ title: "Ticket Deleted" });
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
             ADMIN SUPPORT & BROADCASTS
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time Customer Relations & Updates</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none px-3 py-1 font-bold text-[10px]">
            {tickets.filter(t => t.status === 'open').length} ACTIVE TICKETS
          </Badge>
          <Badge className="bg-orange-600 text-white border-none px-3 py-1 font-bold text-[10px]">
            {announcements.length} BROADCASTS
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="tickets" className="flex-grow flex flex-col overflow-hidden">
        <div className="px-6 bg-white border-b z-10">
          <TabsList className="bg-transparent h-12 gap-6">
            <TabsTrigger value="tickets" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-0 font-black text-[11px] uppercase tracking-widest">Support Tickets</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent px-0 font-black text-[11px] uppercase tracking-widest">System Broadcasts</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tickets" className="flex-grow flex overflow-hidden m-0">
          <div className="flex w-full overflow-hidden relative">
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
                    className={`group p-5 rounded-3xl cursor-pointer transition-all duration-300 border-2 relative ${
                      selectedTicket?.id === t.id 
                        ? 'bg-white border-blue-600 shadow-2xl shadow-blue-100 scale-[1.02] z-10' 
                        : 'bg-white border-transparent hover:border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    {t.status === 'open' && selectedTicket?.id !== t.id && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-blue-600 uppercase tracking-tighter truncate max-w-[180px] mb-0.5">{t.userEmail}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Ticket ID: {t.id.slice(0,6)}</span>
                      </div>
                      <Badge className={`text-[10px] font-black h-6 uppercase px-3 border-none shadow-sm ${
                        t.status === 'open' ? 'bg-red-500 text-white' : 
                        t.status === 'replied' ? 'bg-blue-500 text-white' : 
                        'bg-green-500 text-white'
                      }`}>
                        {t.status}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-black text-gray-900 truncate mb-1.5">{t.subject || "No Subject"}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2 font-medium leading-relaxed italic border-l-2 border-gray-100 pl-3">{t.lastMessage}</p>
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                        {t.lastMessageAt?.seconds ? new Date(t.lastMessageAt.seconds * 1000).toLocaleDateString() : 'New'}
                      </span>
                      <div className="flex items-center gap-1">
                         <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'open' ? 'bg-red-500' : 'bg-gray-200'}`} />
                         <span className="text-[9px] font-black text-gray-300 uppercase">System Active</span>
                      </div>
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
                      <Button variant="ghost" size="icon" onClick={() => deleteTicket(selectedTicket.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full h-10 w-10">
                        <Trash2 className="w-5 h-5" />
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

                  <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-[#f0f2f5] pattern-dots relative scroll-smooth">
                    {replies.map((r, i) => (
                      <div key={r.id || i} className={`flex flex-col ${r.sender === 'admin' ? 'items-end ml-auto' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                        <div className={`p-5 rounded-[2rem] shadow-sm relative ${
                          r.sender === 'admin' 
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200/50' 
                            : 'bg-white border-2 border-gray-100 text-gray-800 rounded-tl-none'
                        }`}>
                           {/* Tail */}
                           <div className={`absolute top-0 w-4 h-4 ${
                            r.sender === 'admin' 
                              ? 'right-[-10px] bg-blue-600 [clip-path:polygon(0_0,0_100%,100%_0)]' 
                              : 'left-[-10px] bg-white border-l-2 border-t-2 border-gray-100 [clip-path:polygon(100%_0,0_0,100%_100%)]'
                          }`} />

                          <p className="text-sm font-bold leading-relaxed">{r.text}</p>
                          <div className="flex justify-end items-center gap-2 mt-3 pt-2 border-t border-black/5">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                              {r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                            {r.sender === 'admin' && (
                              r.read ? <CheckCheck className="h-4 w-4 text-blue-200" /> : <Check className="h-4 w-4 text-blue-300" />
                            )}
                          </div>
                        </div>
                        <div className={`mt-2 text-[9px] font-black uppercase tracking-widest ${r.sender === 'admin' ? 'text-blue-500 mr-3' : 'text-gray-400 ml-3'}`}>
                          {r.sender === 'admin' ? 'Admin Team' : 'User Response'}
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
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-[#f8f9fa]">
                  <MessageSquare className="h-14 w-14 text-blue-600 opacity-20 mb-4" />
                  <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Support Terminal</h3>
                  <p className="text-xs max-w-[280px] leading-relaxed text-gray-500 font-bold uppercase tracking-widest opacity-60">Select a conversation to begin.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="flex-grow flex flex-col overflow-hidden m-0 p-6 bg-gray-50">
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">System Broadcasts</h2>
              <Dialog open={openAnnouncement} onOpenChange={setOpenAnnouncement}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl px-6 h-12 uppercase tracking-widest text-[11px] gap-2 shadow-lg shadow-blue-100">
                    <Plus className="w-4 h-4" /> New Broadcast
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

            <div className="grid grid-cols-1 gap-4">
              {announcements.map((ann) => (
                <Card key={ann.id} className="border-2 border-transparent hover:border-blue-100 transition-all duration-300 rounded-[2rem] shadow-sm hover:shadow-xl group bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                          <Megaphone className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 leading-tight">{ann.title}</h3>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            {ann.createdAt?.seconds ? new Date(ann.createdAt.seconds * 1000).toLocaleString() : 'Recent'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteAnn(ann.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl h-10 w-10">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-sm font-medium text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100 italic">
                      {ann.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
              {announcements.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-200">
                  <Megaphone className="w-16 h-16 text-gray-200 mb-4" />
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Broadcasts Active</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
