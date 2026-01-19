import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Megaphone, Trash2, Send, History, CheckCheck, Check, User, ShieldCheck, Plus } from "lucide-react";
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
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ticketsRef = db.collection('support_tickets');
    const unsubscribe = ticketsRef
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot((snap: any) => {
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
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!selectedTicket) {
      setReplies([]);
      return;
    }

    const unsubscribe = db.collection('support_tickets')
      .doc(selectedTicket.id)
      .collection('replies')
      .orderBy('createdAt', 'asc')
      .onSnapshot((snap: any) => {
        const replyList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setReplies(replyList);
        
        const unreadReplies = snap.docs.filter((d: any) => d.data().senderRole === 'user' && !d.data().read);
        unreadReplies.forEach((d: any) => {
          d.ref.update({ read: true }).catch(console.error);
        });
      }, (err: any) => {
        console.error("Replies listener error:", err);
      });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  useEffect(() => { loadData(); }, []);

  const handleReply = async (id: string) => {
    if (!replyMsg.trim()) return;
    try {
      const reply = {
        message: replyMsg,
        senderRole: 'admin',
        createdAt: Date.now(),
        read: false
      };

      await db.collection('support_tickets').doc(id).collection('replies').add(reply);
      await db.collection('support_tickets').doc(id).update({ 
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
      await db.collection('support_tickets').doc(id).update({ 
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

  if (loading && announcements.length === 0) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col p-4 md:p-6 bg-gray-50/30">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Support Center</h2>
          <p className="text-sm text-gray-500">Real-time user inquiries and announcements</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 text-xs bg-blue-50 text-blue-600 border-blue-200">
            {tickets.filter(t => t.status === 'open').length} Open Tickets
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="tickets" className="flex-grow flex flex-col space-y-4 overflow-hidden">
        <TabsList className="w-fit bg-white border shadow-sm p-1 rounded-lg">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
            <MessageSquare className="mr-2 h-4 w-4" /> Tickets
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
            <Megaphone className="mr-2 h-4 w-4" /> Announcements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden">
          <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
            {/* Sidebar */}
            <div className="w-full md:w-[350px] flex flex-col gap-4 overflow-hidden h-full">
              <Card className="flex-grow flex flex-col overflow-hidden border shadow-sm rounded-xl">
                <CardHeader className="py-4 border-b bg-gray-50/50">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700">
                      <History className="h-4 w-4 text-blue-600" /> Inbox
                    </CardTitle>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">{tickets.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-2 space-y-2 pb-4 bg-white scrollbar-hide">
                  {tickets.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTicket(t)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedTicket?.id === t.id 
                          ? 'bg-blue-50 border-blue-400 shadow-sm' 
                          : 'bg-white hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-semibold text-gray-500 truncate max-w-[150px]">{t.userEmail}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] h-4 uppercase px-1.5 ${
                            t.status === 'open' ? 'bg-red-50 text-red-600 border-red-200' : 
                            t.status === 'replied' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                            'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 truncate">{t.subject || "No Subject"}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{t.message}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                        <span className="text-[9px] text-gray-400 font-medium">
                          {new Date(t.lastMessageAt || t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                      <MessageSquare className="h-12 w-12 mb-3 opacity-10" />
                      <p className="text-sm font-medium">No messages yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="flex-grow flex flex-col overflow-hidden h-full">
              <Card className="flex-grow flex flex-col overflow-hidden border shadow-sm rounded-xl">
                {selectedTicket ? (
                  <>
                    <CardHeader className="py-4 border-b bg-white shadow-sm z-10">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold text-gray-900">{selectedTicket.subject}</CardTitle>
                            <CardDescription className="text-xs text-gray-500 font-medium">{selectedTicket.userEmail}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {selectedTicket.status !== 'solved' && (
                            <Button variant="outline" size="sm" onClick={() => markAsSolved(selectedTicket.id)} className="text-green-600 border-green-200 hover:bg-green-50 h-8 text-[11px] font-bold">
                              RESOLVE
                            </Button>
                          )}
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-400 bg-gray-50 border-gray-200">
                            #{selectedTicket.id.slice(0, 6)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] pattern-dots">
                      {/* Initial Message */}
                      <div className="flex flex-col items-start max-w-[90%]">
                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border shadow-sm border-gray-100">
                          <p className="text-[13px] text-gray-800 leading-relaxed font-medium">{selectedTicket.message}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{new Date(selectedTicket.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                      </div>

                      {replies.map((r, i) => (
                        <div key={r.id || i} className={`flex flex-col ${r.senderRole === 'admin' ? 'items-end ml-auto' : 'items-start'} max-w-[90%]`}>
                          <div className={`p-4 rounded-2xl shadow-sm ${
                            r.senderRole === 'admin' 
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100' 
                              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                          }`}>
                            <p className="text-[13px] leading-relaxed font-medium">{r.message}</p>
                            <div className="flex justify-end items-center gap-1.5 mt-1.5 opacity-80">
                              <span className="text-[9px] font-bold uppercase tracking-wider">{new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              {r.senderRole === 'admin' && (
                                r.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </CardContent>

                    <div className="p-4 border-t bg-white space-y-3">
                      <div className="relative group">
                        <Textarea 
                          placeholder="Type your response..." 
                          value={replyMsg}
                          onChange={(e) => setReplyMsg(e.target.value)}
                          className="min-h-[90px] bg-gray-50/50 border-gray-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl text-[13px] pr-12 transition-all resize-none font-medium"
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
                          className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 disabled:opacity-30 disabled:shadow-none transition-all"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest">Shift + Enter for new line</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-gray-400 p-12 text-center bg-gray-50/30">
                    <div className="h-24 w-24 rounded-3xl bg-white border border-gray-100 flex items-center justify-center mb-6 shadow-xl shadow-gray-100 rotate-3">
                      <MessageSquare className="h-10 w-10 text-blue-500 opacity-20 -rotate-3" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Select a Conversation</h3>
                    <p className="text-xs max-w-[280px] leading-relaxed text-gray-500 font-medium">Respond to user inquiries instantly with our real-time support system.</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="data-[state=inactive]:hidden h-full flex flex-col">
          <div className="flex justify-end mb-4">
            <Dialog open={openAnnouncement} onOpenChange={setOpenAnnouncement}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 rounded-xl px-6 h-10 font-bold text-xs"><Plus className="mr-2 h-4 w-4" /> NEW ANNOUNCEMENT</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-none shadow-2xl">
                <DialogHeader><DialogTitle className="text-xl font-black">Post Announcement</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Title</Label>
                    <Input className="rounded-xl border-gray-200 h-11 text-sm font-bold" value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} placeholder="e.g. System Maintenance" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Content</Label>
                    <Textarea className="rounded-xl border-gray-200 min-h-[120px] text-sm font-medium resize-none" value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} placeholder="Describe the announcement in detail..." />
                  </div>
                  <Button className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 font-black shadow-lg shadow-blue-100 mt-2" onClick={handleCreateAnn}>PUBLISH ANNOUNCEMENT</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border shadow-sm rounded-xl flex-grow overflow-hidden flex flex-col">
            <CardHeader className="bg-gray-50/50 border-b">
              <CardTitle className="text-sm font-black text-gray-900 uppercase tracking-widest">Active Broadcasts</CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-grow overflow-y-auto space-y-3 bg-white">
              {announcements.map((a) => (
                <div key={a.id} className="flex items-start justify-between p-4 border rounded-2xl bg-white hover:border-blue-200 transition-all group shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 text-sm">{a.title}</h4>
                      <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-600 border-blue-100 uppercase font-black">Active</Badge>
                    </div>
                    <p className="text-[13px] text-gray-600 font-medium leading-relaxed">{a.content}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest pt-1">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => handleDeleteAnn(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20 bg-gray-50/30 rounded-2xl border border-dashed">
                   <Megaphone className="h-10 w-10 mb-4 opacity-10" />
                   <p className="text-sm font-bold uppercase tracking-widest">No Active Announcements</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
