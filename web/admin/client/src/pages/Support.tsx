import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Megaphone, Trash2, Send, Plus, History, CheckCheck, Check, User, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAnnouncements, createAnnouncement, deleteAnnouncement, db } from "@/lib/backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
      const [anns] = await Promise.all([getAnnouncements()]);
      setAnnouncements(anns || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Real-time tickets listener for admin
  useEffect(() => {
    const unsubscribe = db.collection('support_tickets')
      .orderBy('lastMessageAt', 'desc')
      .onSnapshot((snap: any) => {
        const ticketList = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setTickets(ticketList);
        
        if (selectedTicket) {
          const updated = ticketList.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  // Real-time replies listener for selected ticket
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
        setReplies(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        
        // Mark as read when admin views them
        const unreadReplies = snap.docs.filter((d: any) => d.data().senderRole === 'user' && !d.data().read);
        unreadReplies.forEach((d: any) => {
          d.ref.update({ read: true });
        });
      });

    return () => unsubscribe();
  }, [selectedTicket?.id]);

  useEffect(() => { loadData(); }, []);

  const handleReply = async (id: string) => {
    if (!replyMsg) return;
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

      toast({ title: "Success", description: "Reply sent to user" });
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

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Support & Communications</h2>
          <p className="text-muted-foreground">Manage user support tickets and system-wide announcements.</p>
        </div>
      </div>

      <Tabs defaultValue="tickets" className="flex-grow flex flex-col space-y-4 overflow-hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="tickets"><MessageSquare className="mr-2 h-4 w-4" /> Support Tickets</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4" /> Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden">
          <div className="flex-grow flex gap-6 overflow-hidden">
            {/* Ticket List Area */}
            <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
              <Card className="flex-grow flex flex-col overflow-hidden">
                <CardHeader className="py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" /> Active Conversations
                    </CardTitle>
                    <Badge variant="secondary">{tickets.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto px-2 space-y-2 pb-4">
                  {tickets.map((t) => (
                    <div 
                      key={t.id} 
                      onClick={() => setSelectedTicket(t)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        selectedTicket?.id === t.id 
                          ? 'bg-primary/10 border-primary ring-1 ring-primary/20' 
                          : 'bg-card hover:bg-muted/50 border-transparent hover:border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[150px]">{t.userEmail}</span>
                        <Badge variant={t.status === 'open' ? 'destructive' : t.status === 'replied' ? 'default' : 'secondary'} className="text-[9px] h-4">
                          {t.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold truncate">{t.subject}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{t.message}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.lastMessageAt || t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                      <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">No active tickets found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Chat Area */}
            <div className="flex-grow flex flex-col overflow-hidden">
              <Card className="flex-grow flex flex-col overflow-hidden">
                {selectedTicket ? (
                  <>
                    <CardHeader className="py-4 border-b">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{selectedTicket.subject}</CardTitle>
                            <CardDescription className="text-xs">{selectedTicket.userEmail}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                          Ticket ID: {selectedTicket.id.slice(0, 8)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 bg-muted/20">
                      {/* Initial Message */}
                      <div className="flex flex-col items-start max-w-[85%]">
                        <div className="bg-background p-3 rounded-2xl rounded-tl-none border shadow-sm">
                          <p className="text-sm">{selectedTicket.message}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">User • {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>

                      {replies.map((r, i) => (
                        <div key={r.id || i} className={`flex flex-col ${r.senderRole === 'admin' ? 'items-end ml-auto' : 'items-start'} max-w-[85%]`}>
                          <div className={`p-3 rounded-2xl shadow-sm ${
                            r.senderRole === 'admin' 
                              ? 'bg-primary text-primary-foreground rounded-tr-none' 
                              : 'bg-background border rounded-tl-none'
                          }`}>
                            <p className="text-sm">{r.message}</p>
                            {r.senderRole === 'admin' && (
                              <div className="flex justify-end mt-1">
                                {r.read ? <CheckCheck className="h-3 w-3 opacity-70" /> : <Check className="h-3 w-3 opacity-70" />}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1 px-1">
                            {r.senderRole === 'admin' ? (
                              <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> You (Admin)</span>
                            ) : 'User'} • {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </CardContent>

                    <div className="p-4 border-t bg-background space-y-4">
                      <div className="space-y-2">
                        <Textarea 
                          placeholder="Type your reply to the user..." 
                          value={replyMsg}
                          onChange={(e) => setReplyMsg(e.target.value)}
                          className="min-h-[80px] bg-muted/30 focus-visible:ring-primary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(selectedTicket.id);
                            }
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          {selectedTicket.status !== 'solved' && (
                            <Button variant="outline" size="sm" onClick={() => markAsSolved(selectedTicket.id)} className="border-green-600 text-green-600 hover:bg-green-50 h-9">
                              Mark as Solved
                            </Button>
                          )}
                          <Button size="sm" onClick={() => handleReply(selectedTicket.id)} disabled={!replyMsg} className="h-9 px-6">
                            <Send className="mr-2 h-4 w-4" /> Send Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/10">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-10 w-10 opacity-20" />
                    </div>
                    <h3 className="text-lg font-bold">Admin Support Chat</h3>
                    <p className="text-sm max-w-[300px] mt-1 opacity-60">Select a user conversation from the left to start responding and resolving inquiries.</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <div className="flex justify-end mb-4">
            <Dialog open={openAnnouncement} onOpenChange={setOpenAnnouncement}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Post Announcement</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newAnn.title} onChange={e => setNewAnn({...newAnn, title: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea value={newAnn.content} onChange={e => setNewAnn({...newAnn, content: e.target.value})} />
                  </div>
                  <Button className="w-full" onClick={handleCreateAnn}>Post to Users</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Active Announcements</CardTitle>
              <CardDescription>Messages currently visible to users upon login.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 border rounded-lg group">
                    <div>
                      <h4 className="font-bold">{a.title}</h4>
                      <p className="text-sm text-muted-foreground">{a.content}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteAnn(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {announcements.length === 0 && <p className="text-center text-muted-foreground py-8">No active announcements</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
