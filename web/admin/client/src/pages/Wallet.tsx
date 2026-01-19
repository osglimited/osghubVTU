import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Wallet as WalletIcon, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { creditWallet, debitWallet, getWalletLogs, getWalletRequests, approveWalletRequest, rejectWalletRequest } from "@/lib/backend";

export default function WalletPage() {
  const { toast } = useToast();
  const [creditForm, setCreditForm] = useState({ userId: '', amount: '', reason: '' });
  const [debitForm, setDebitForm] = useState({ userId: '', amount: '', reason: '' });
  const [processing, setProcessing] = useState<'credit'|'debit'|null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const load = async () => {
    setLoadingRequests(true);
    try {
      const [wl, dp] = await Promise.all([getWalletLogs(), getWalletRequests()]);
      setLogs(wl || []);
      setDeposits(dp || []);
    } catch {
      setLogs([]);
      setDeposits([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    load();
    try {
      const params = new URLSearchParams(window.location.search);
      const prefill = params.get("userId");
      if (prefill) {
        setCreditForm(prev => ({ ...prev, userId: prefill }));
        setDebitForm(prev => ({ ...prev, userId: prefill }));
      }
    } catch {}
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await approveWalletRequest(id);
      toast({ title: "Approved", description: "Funding request approved" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectWalletRequest(id);
      toast({ title: "Rejected", description: "Funding request rejected" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Wallet Management</h2>
          <p className="text-muted-foreground">Manage funding requests and manual adjustments.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loadingRequests}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loadingRequests ? 'animate-spin' : ''}`} />
          Refresh Requests
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{deposits.filter(d => d.status === 'pending').length}</div>
            <p className="text-xs opacity-70 mt-1">Total value: ₦{deposits.filter(d => d.status === 'pending').reduce((s, d) => s + Number(d.amount || 0), 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{deposits.filter(d => {
              const dd = new Date(d.createdAt ? (d.createdAt._seconds ? d.createdAt._seconds * 1000 : d.createdAt) : Date.now());
              const now = new Date();
              return d.status === 'success' && dd.getDate() === now.getDate() && dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear();
            }).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total value: ₦{deposits.filter(d => {
              const dd = new Date(d.createdAt ? (d.createdAt._seconds ? d.createdAt._seconds * 1000 : d.createdAt) : Date.now());
              const now = new Date();
              return d.status === 'success' && dd.getDate() === now.getDate() && dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear();
            }).reduce((s, d) => s + Number(d.amount || 0), 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Funded (Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦{deposits.filter(d => {
              const dd = new Date(d.createdAt ? (d.createdAt._seconds ? d.createdAt._seconds * 1000 : d.createdAt) : Date.now());
              const now = new Date();
              return d.status === 'success' && dd.getMonth() === now.getMonth() && dd.getFullYear() === now.getFullYear();
            }).reduce((s, d) => s + Number(d.amount || 0), 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">+ recent</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Funding Requests</TabsTrigger>
          <TabsTrigger value="adjust">Manual Adjustment</TabsTrigger>
          <TabsTrigger value="logs">Wallet Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Funding Requests</CardTitle>
              <CardDescription>
                Review and approve wallet funding requests from users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                        No funding requests yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    deposits.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.id}</TableCell>
                        <TableCell>{d.userEmail || d.user || "System"}</TableCell>
                        <TableCell>₦{Number(d.amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="capitalize">{d.method || "manual"}</TableCell>
                        <TableCell>{new Date(d.createdAt ? (d.createdAt._seconds ? d.createdAt._seconds * 1000 : d.createdAt) : Date.now()).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'approved' ? 'default' : d.status === 'pending' ? 'secondary' : 'destructive'} className={d.status === 'approved' ? 'bg-emerald-500' : ''}>
                            {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {d.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleApprove(d.id)} className="text-emerald-600">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleReject(d.id)} className="text-destructive">
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjust">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Credit User Wallet</CardTitle>
                <CardDescription>Manually add funds to a user's wallet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Email / ID</label>
                  <Input placeholder="Enter user email..." value={creditForm.userId} onChange={e => setCreditForm(prev => ({ ...prev, userId: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₦)</label>
                  <Input type="number" placeholder="0.00" value={creditForm.amount} onChange={e => setCreditForm(prev => ({ ...prev, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <Input placeholder="Bonus / Refund / Correction" value={creditForm.reason} onChange={e => setCreditForm(prev => ({ ...prev, reason: e.target.value }))} />
                </div>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={processing === 'credit'}
                  onClick={async () => {
                    if (!creditForm.userId || !creditForm.amount) {
                      toast({ title: 'Missing fields', description: 'Provide user and amount', variant: 'destructive' });
                      return;
                    }
                    setProcessing('credit');
                    try {
                      const amt = Number(creditForm.amount);
                      const res = await creditWallet({ userId: creditForm.userId, amount: amt, walletType: "main", description: creditForm.reason || "Manual Credit" });
                      if (res && res.success) {
                        toast({ title: 'Wallet Credited', description: `New balance: ₦${Number(res.newBalance || 0).toLocaleString()}` });
                        setCreditForm({ userId: '', amount: '', reason: '' });
                      } else {
                        toast({ title: 'Credit Failed', description: res?.error || 'Unable to credit', variant: 'destructive' });
                      }
                    } catch (e: any) {
                      toast({ title: 'Credit Failed', description: e.message || 'Unexpected error', variant: 'destructive' });
                    } finally {
                      setProcessing(null);
                    }
                  }}
                >
                  Credit Wallet
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Debit User Wallet</CardTitle>
                <CardDescription>Manually remove funds from a user's wallet.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Email / ID</label>
                  <Input placeholder="Enter user email..." value={debitForm.userId} onChange={e => setDebitForm(prev => ({ ...prev, userId: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₦)</label>
                  <Input type="number" placeholder="0.00" value={debitForm.amount} onChange={e => setDebitForm(prev => ({ ...prev, amount: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <Input placeholder="Correction / Penalty" value={debitForm.reason} onChange={e => setDebitForm(prev => ({ ...prev, reason: e.target.value }))} />
                </div>
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  disabled={processing === 'debit'} 
                  onClick={async () => {
                    if (!debitForm.userId || !debitForm.amount) {
                      toast({ title: 'Missing fields', description: 'Provide user and amount', variant: 'destructive' });
                      return;
                    }
                    setProcessing('debit');
                    try {
                      const amt = Number(debitForm.amount);
                      const res = await debitWallet({ userId: debitForm.userId, amount: amt, walletType: "main", description: debitForm.reason || "Manual Debit" });
                      if (res && res.success) {
                        toast({ title: 'Wallet Debited', description: `New balance: ₦${Number(res.newBalance || 0).toLocaleString()}` });
                        setDebitForm({ userId: '', amount: '', reason: '' });
                      } else {
                        toast({ title: 'Debit Failed', description: res?.error || 'Unable to debit', variant: 'destructive' });
                      }
                    } catch (e: any) {
                      toast({ title: 'Debit Failed', description: e.message || 'Unexpected error', variant: 'destructive' });
                    } finally {
                      setProcessing(null);
                    }
                  }}
                >
                  Debit Wallet
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Wallet Logs</CardTitle>
              <CardDescription>Recent wallet credits and debits.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.id}</TableCell>
                      <TableCell>{l.user}</TableCell>
                      <TableCell>
                        <Badge variant={l.type === 'credit' ? 'default' : 'secondary'} className={l.type === 'credit' ? 'bg-emerald-500' : ''}>
                          {l.type}
                        </Badge>
                      </TableCell>
                      <TableCell>₦{Number(l.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{new Date(l.createdAt ? (l.createdAt._seconds ? l.createdAt._seconds * 1000 : l.createdAt) : Date.now()).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
