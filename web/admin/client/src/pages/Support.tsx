import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Megaphone, Trash2, Send, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTickets, replyTicket, getAnnouncements, createAnnouncement, deleteAnnouncement } from "@/lib/backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAnnouncement, setOpenAnnouncement] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', content: '', type: 'info' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tks, anns] = await Promise.all([getTickets(), getAnnouncements()]);
      setTickets(tks || []);
      setAnnouncements(anns || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleReply = async (id: string) => {
    const msg = prompt("Enter your reply to the user:");
    if (!msg) return;
    try {
      await replyTicket(id, msg);
      toast({ title: "Success", description: "Reply sent to user" });
      loadData();
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Support & Communications</h2>
          <p className="text-muted-foreground">Manage user support tickets and system-wide announcements.</p>
        </div>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets"><MessageSquare className="mr-2 h-4 w-4" /> Support Tickets</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4" /> Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Open Tickets</CardTitle>
              <CardDescription>Respond to user inquiries and support requests.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center">No tickets found</TableCell></TableRow>
                  ) : tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.userEmail || t.userId}</TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'open' ? 'destructive' : 'default'}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleReply(t.id)}><Send className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
