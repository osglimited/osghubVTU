import { useQuery } from "@tanstack/react-query";
import { getFinanceAnalytics, listUsers } from "@/lib/backend";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function FinancePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUid, setSelectedUid] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const toRange = () => {
    const start = startDate ? new Date(startDate + "T00:00:00").getTime() : undefined;
    const end = endDate ? new Date(endDate + "T23:59:59").getTime() : undefined;
    return { start, end };
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await listUsers(500);
        if (mounted) setUsers(rows || []);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["finance-analytics", selectedUid, startDate, endDate],
    queryFn: async () => {
      const { start, end } = toRange();
      return await getFinanceAnalytics({ uid: selectedUid || undefined, start, end });
    },
    refetchInterval: 10000,
    staleTime: 8000,
  });
  const daily = data?.daily || { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 };
  const weekly = data?.weekly || { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 };
  const monthly = data?.monthly || { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 };
  const requiredProviderBalance = Number(data?.providerBalanceRequired || 0);
  const walletBalance = Number(data?.walletBalance || 0);
  const totals = data?.totals || { depositsTotal: 0, providerCostTotal: 0, smsCostTotal: 0, netProfitTotal: 0 };
  const txs = (data?.transactions || []).slice(0, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Financial Intelligence</h2>
            <p className="text-muted-foreground">Single engine: All Users or specific user.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Scope</label>
          <select
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.uid || u.id} value={u.uid || u.id}>
                {u.displayName || u.email || u.uid}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background" />
          <span className="text-muted-foreground">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-background" />
        </div>
      </div>

      {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading analytics...</div>}
      {isError && <div className="p-6 text-sm text-destructive">Failed to load analytics</div>}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle>Provider Balance Required</CardTitle>
            <CardDescription>Sum of all users' main wallet balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦{requiredProviderBalance.toLocaleString()}</div>
          </CardContent>
        </Card>
        {selectedUid && (
          <Card className="border-none shadow-sm md:col-span-1">
            <CardHeader>
              <CardTitle>User Balance</CardTitle>
              <CardDescription>Main wallet balance of selected user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₦{walletBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-none shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Daily, weekly, monthly</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Deposits</TableHead>
                  <TableHead>Provider Cost</TableHead>
                  <TableHead>SMS Cost</TableHead>
                  <TableHead>Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Daily</TableCell>
                  <TableCell>₦{Number(daily.deposits || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(daily.providerCost || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(daily.smsCost || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(daily.netProfit || 0).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Weekly</TableCell>
                  <TableCell>₦{Number(weekly.deposits || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(weekly.providerCost || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(weekly.smsCost || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(weekly.netProfit || 0).toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Monthly</TableCell>
                  <TableCell>₦{Number(monthly.deposits || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(monthly.providerCost || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(monthly.smsCost || 0).toLocaleString()}</TableCell>
                  <TableCell>₦{Number(monthly.netProfit || 0).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm md:col-span-1">
          <CardHeader>
            <CardTitle>Totals (Filtered Range)</CardTitle>
            <CardDescription>Combined across selected date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposits</span>
              <span className="font-bold">₦{Number(totals.depositsTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Provider Cost</span>
              <span className="font-bold">₦{Number(totals.providerCostTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SMS Cost</span>
              <span className="font-bold">₦{Number(totals.smsCostTotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Profit</span>
              <span className="font-bold">₦{Number(totals.netProfitTotal || 0).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Transaction Breakdown</CardTitle>
          <CardDescription>Recent transactions in selected scope</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User Price</TableHead>
                <TableHead>Provider Cost</TableHead>
                <TableHead>SMS Cost</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">No transactions</TableCell>
                </TableRow>
              ) : txs.map((t) => {
                const net = Number(t.userPrice || 0) - Number(t.providerCost || 0) - Number(t.smsCost || 0);
                const created = t.createdAt ? new Date(t.createdAt).toLocaleString() : "-";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell>{t.user}</TableCell>
                    <TableCell>{t.serviceType}</TableCell>
                    <TableCell>₦{Number(t.userPrice || 0).toLocaleString()}</TableCell>
                    <TableCell>₦{Number(t.providerCost || 0).toLocaleString()}</TableCell>
                    <TableCell>₦{Number(t.smsCost || 0).toLocaleString()}</TableCell>
                    <TableCell>₦{net.toLocaleString()}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell>{created}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
