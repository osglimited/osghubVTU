import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {app.post("/api/admin/wallet/credit", adminAuth, (req, res) => {
  const userId = String((req.body?.userId as string) || "");
  const amount = Number((req.body?.amount as number) || 0);
  const walletType = String((req.body?.walletType as string) || "main");

  const doInsert = async () => {
    const db = getFirestore();
    let resolvedUid = "";
    let resolvedEmail = "";

    // Resolve userId as email or uid
    if (userId.includes("@")) {
      const u = await getAuth().getUserByEmail(userId);
      resolvedUid = String(u.uid || "").toLowerCase();
      resolvedEmail = String(u.email || userId || "").toLowerCase();
    } else {
      const u = await getAuth().getUser(userId);
      resolvedUid = String(u.uid || userId || "").toLowerCase();
      resolvedEmail = String(u.email || "").toLowerCase();
    }

    const targetIds = Array.from(new Set([resolvedUid, resolvedEmail].filter(Boolean)));

    // Write admin_transactions row for this user only
    await db.collection("admin_transactions").doc(id).set({
      id,
      user_email: userId,
      amount,
      status: "success",
      type: "credit",
      createdAt: Date.now(),
    });

    // Update only that user's wallet/user_wallet documents
    for (const tid of targetIds) {
      // update user_wallets/<tid> and wallets/<tid> ...
    }

    // Wallet log per user
    await db.collection("wallet_logs").doc(logId).set({
      id: logId,
      user_email: userId,
      type: "credit",
      amount,
      description: String(req.body?.description || "Admin credit"),
      createdAt: Date.now(),
    });
  };

  res.json({ success: true<DropdownMenuItem
  onClick={() => {
    const targetUid = String(user.uid || user.id || "");
    if (!targetUid) return;
    setLocation(`/users/${encodeURIComponent(targetUid)}`);
  }}
>
  View Profile
</DropdownMenuItem><DropdownMenuItem
  onClick={() => {
    const targetUid = String(user.uid || user.id || "");
    if (!targetUid) return;
    setLocation(`/users/${encodeURIComponent(targetUid)}`);
  }}
>
  View Profile
</DropdownMenuItem><Route path="/users/:uid" component={UserProfilePage} />
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Download, RotateCcw } from "lucide-react";
import { getAllTransactions, getUserTransactions } from "@/lib/backend";
import { Link } from "wouter";
import { useEffectOnce } from "@/lib/useEffectOnce";

export default function TransactionsPage() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<{ uid?: string; email?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        let data: any[] = [];
        try {
          const params = new URLSearchParams(window.location.search);
          const uid = params.get("uid") || undefined;
          const email = params.get("email") || undefined;
          if (uid || email) {
            setContext({ uid, email });
            data = await getUserTransactions({ uid, email });
          } else {
            data = await getAllTransactions();
          }
        } catch {
          data = await getAllTransactions();
        }
        if (!mounted) return;
        setTransactions(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const typeOk = filterType === "all" ? true : String(t.type || '').toLowerCase() === filterType;
      const statusOk = filterStatus === "all" ? true : String(t.status || '').toLowerCase() === filterStatus;
      return typeOk && statusOk;
    });
  }, [transactions, filterType, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Transactions</h2>
          <p className="text-muted-foreground">
            {context?.uid || context?.email ? "Viewing transactions for selected user" : "View and manage all system transactions."}
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search ID or User..." className="pl-9" />
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="airtime">Airtime</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="cable">Cable TV</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading transactions...</div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider Status</TableHead>
                <TableHead>Provider Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell className="font-medium">{t.userId || t.user || '-'}</TableCell>
                  <TableCell>{t.type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t.details ? JSON.stringify(t.details) : t.description || '-'}
                  </TableCell>
                  <TableCell>₦{Number(t.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    {t.createdAt 
                      ? new Date(t.createdAt._seconds ? t.createdAt._seconds * 1000 : t.createdAt).toLocaleString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'success' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'} 
                           className={t.status === 'success' ? 'bg-emerald-500' : t.status === 'pending' ? 'bg-amber-500' : ''}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.providerStatus === 'success' ? 'default' : t.providerStatus === 'processing' ? 'secondary' : 'destructive'} 
                           className={t.providerStatus === 'success' ? 'bg-emerald-500' : t.providerStatus === 'processing' ? 'bg-amber-500' : ''}>
                      {t.providerStatus || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-red-600 max-w-[200px] truncate" title={t.providerErrorMessage || ''}>
                    {t.providerErrorMessage || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {t.status === 'failed' && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Retry Transaction">
                        <RotateCcw className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    <Link href={`/transactions/${encodeURIComponent(t.id)}`}>
                      <Button size="sm" variant="outline">View</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
