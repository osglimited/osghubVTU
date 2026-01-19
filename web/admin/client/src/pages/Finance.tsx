import { useQuery } from "@tanstack/react-query";
import { getFinanceAnalytics, listUsers, getAllPlans } from "@/lib/backend";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

export default function FinancePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedScope, setSelectedScope] = useState<string>("");
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
    queryKey: ["finance-analytics", selectedScope, startDate, endDate],
    queryFn: async () => {
      const { start, end } = toRange();
      const [uid, email] = selectedScope ? selectedScope.split("|") : ["", ""];
      return await getFinanceAnalytics({ uid: uid || undefined, email: email || undefined, start, end });
    },
    staleTime: 10000,
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
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.uid || u.id} value={`${u.uid || u.id}|${u.email || ""}`}>
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
        <Card className="border-none shadow-md md:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-primary text-lg font-bold flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-primary/10">💰</span>
              Provider Balance Required
            </CardTitle>
            <CardDescription className="text-xs">
              Minimum funds needed in provider accounts to cover user obligations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tracking-tight">₦{requiredProviderBalance.toLocaleString()}</div>
            <div className="mt-2 text-[10px] text-muted-foreground bg-white/50 w-fit px-2 py-0.5 rounded-full border border-primary/10">
              Auto-calculated: User Balance × Optimization Ratio
            </div>
          </CardContent>
        </Card>
        {selectedScope ? (
          <Card className="border-none shadow-md md:col-span-1 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-2">
              <CardTitle className="text-blue-700 text-lg font-bold flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-blue-100">👤</span>
                User Wallet Balance
              </CardTitle>
              <CardDescription className="text-xs">Current available funds for this specific user.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-700 tracking-tight">₦{walletBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-md md:col-span-1 bg-gradient-to-br from-indigo-50 to-white hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-indigo-700 text-lg font-bold flex items-center gap-2">
                <span className="p-1.5 rounded-full bg-indigo-100">📊</span>
                Total User Balances
              </CardTitle>
              <CardDescription className="text-xs">Aggregate of all user wallet balances platform-wide.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-indigo-700 tracking-tight">₦{Number(data?.totalWalletBalance || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        )}
        <Card className="border-none shadow-md md:col-span-1 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 text-lg font-bold flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-green-100">📈</span>
              Profit Analysis
            </CardTitle>
            <CardDescription className="text-xs">Revenue vs Costs breakdown for selected range.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm p-2 rounded-lg bg-green-50/50">
                <span className="text-muted-foreground font-medium">Total Revenue</span>
                <span className="font-bold text-green-700">₦{Number(totals.netProfitTotal + totals.providerCostTotal + totals.smsCostTotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm px-2">
                <span className="text-muted-foreground">Provider Cost</span>
                <span className="font-bold text-red-600">₦{Number(totals.providerCostTotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm px-2 pb-2 border-b border-green-100">
                <span className="text-muted-foreground">SMS Cost</span>
                <span className="font-bold text-red-400">₦{Number(totals.smsCostTotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1 px-2">
                <span className="font-bold text-sm text-green-800">Actual Profit</span>
                <span className="text-xl font-black text-primary animate-pulse-slow">₦{Number(totals.netProfitTotal).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Service Performance (Historical)</CardTitle>
            <CardDescription>Historical performance based only on service transactions (Deposits excluded from profit).</CardDescription>
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
              <TableHead>Error Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.length === 0 ? (
              <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">No transactions</TableCell>
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
                    <TableCell>{String(t.status || '').toLowerCase() === 'success' ? '-' : (t.failureSource || 'unknown')}</TableCell>
                    <TableCell>{t.status}</TableCell>
                    <TableCell>{created}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedScope && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Capacity by Service</CardTitle>
            <CardDescription>Estimated transactions based on user balance</CardDescription>
          </CardHeader>
          <CardContent>
            <CapacityTable walletBalance={walletBalance} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CapacityTable({ walletBalance }: { walletBalance: number }) {
  const { data: plans } = useQuery({
    queryKey: ["service-plans"],
    queryFn: () => getAllPlans(),
    staleTime: 60000,
  });
  const rows = (plans || []).map((p: any) => {
    const price = Number(p.priceApi || p.priceUser || 0);
    const capacity = price > 0 ? Math.floor(Number(walletBalance || 0) / price) : 0;
    return { name: `${p.network || ""} ${p.name || ""}`.trim(), price, capacity };
  }).filter((r: any) => r.price > 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Capacity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">No service plans</TableCell>
          </TableRow>
        ) : rows.map((r: any, i: number) => (
          <TableRow key={i}>
            <TableCell>{r.name}</TableCell>
            <TableCell>₦{r.price.toLocaleString()}</TableCell>
            <TableCell>{r.capacity.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
