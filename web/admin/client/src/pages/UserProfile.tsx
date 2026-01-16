import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRoute, Link } from "wouter";
import { listUsers, getUserTransactions, getFinanceUser } from "@/lib/backend";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function UserProfilePage() {
  const [, params] = useRoute("/users/:uid");
  const uidParam = (params as any)?.uid || "";
  const { toast } = useToast();
  const [user, setUser] = useState<any | null>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [finance, setFinance] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const users = await listUsers(500);
        const found = users.find((u: any) => String(u.uid || u.id || "").toLowerCase() === uidParam.toLowerCase());
        if (!mounted) return;
        setUser(found || null);
        const res = await getUserTransactions({ uid: uidParam, email: String(found?.email || "") });
        setTxs(res || []);
        const fin = await getFinanceUser({ uid: uidParam, email: String(found?.email || "") });
        setFinance(fin || null);
      } catch (e: any) {
        toast({ title: "Failed to load user", description: e.message || "Unable to fetch", variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [uidParam]);

  if (loading && !user) {
    return <div className="p-6 text-sm text-muted-foreground">Loading user...</div>;
  }

  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">User not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">User Profile</h2>
          <p className="text-muted-foreground">View details and activity for this user.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/wallet?userId=${encodeURIComponent(user.email || user.uid || user.id || "")}`}>
            <Button>Fund Wallet</Button>
          </Link>
          <Link href={`/transactions?uid=${encodeURIComponent(user.uid || user.id || "")}&email=${encodeURIComponent(user.email || "")}`}>
            <Button variant="outline">View Transactions</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle>{user.displayName || user.email || user.uid}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">UID</span>
              <span className="font-mono">{user.uid || user.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">Phone</span>
              <span>{user.phone || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b text-sm">
              <span className="text-muted-foreground">Joined</span>
              <span>{user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : "-"}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge className={user.status === 'inactive' ? '' : 'bg-emerald-500'}>
                {user.status === 'inactive' ? 'inactive' : 'active'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>Current balances</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Main Balance</div>
              <div className="text-2xl font-bold">₦{Number(finance?.walletBalance || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Cashback</div>
              <div className="text-2xl font-bold">₦{Number(user.cashbackBalance || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Referral</div>
              <div className="text-2xl font-bold">₦{Number(user.referralBalance || 0).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Totals</CardTitle>
            <CardDescription>User activity</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total Deposited</div>
              <div className="text-2xl font-bold">₦{Number(finance?.totalDeposited || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Total Spent</div>
              <div className="text-2xl font-bold">₦{Number(finance?.totalSpent || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Provider Cost</div>
              <div className="text-2xl font-bold">₦{Number(finance?.totalProviderCost || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">SMS Cost</div>
              <div className="text-2xl font-bold">₦{Number(finance?.totalSmsCost || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4 md:col-span-2">
              <div className="text-sm text-muted-foreground">Net Profit</div>
              <div className="text-2xl font-bold">₦{Number(finance?.netProfit || 0).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Risk Intelligence</CardTitle>
            <CardDescription>Projected provider balance and profit</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Provider Balance Required</div>
              <div className="text-2xl font-bold">₦{Number(finance?.risk?.providerBalanceRequired || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">SMS Cost</div>
              <div className="text-2xl font-bold">₦{Number(finance?.risk?.smsCost || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Expected Profit</div>
              <div className="text-2xl font-bold">₦{Number(finance?.risk?.expectedProfit || 0).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No transactions</TableCell>
                </TableRow>
              ) : txs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell>{t.type}</TableCell>
                  <TableCell>₦{Number(t.amount || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'success' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'} 
                           className={t.status === 'success' ? 'bg-emerald-500' : t.status === 'pending' ? 'bg-amber-500' : ''}>
                      {t.status || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{t.createdAt ? new Date(t.createdAt._seconds ? t.createdAt._seconds * 1000 : t.createdAt).toLocaleString() : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
