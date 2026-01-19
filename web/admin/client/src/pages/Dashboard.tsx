import { useMemo } from "react";
import { getAdminStats } from "@/lib/backend";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, Activity, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";

const defaultChartData: Array<{ name: string; total: number }> = [];

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => await getAdminStats(),
    refetchInterval: 5000,
    staleTime: 4000,
  });
  const chartData = useMemo(() => {
    const days = (stats && stats.dailyTotals) || [];
    return days.map(d => ({ name: d.day, total: d.total }));
  }, [stats]);

  const recent = ((stats && stats.recentTransactions) || []).slice(0, 5);
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome back, here's what's happening today.</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-md bg-muted animate-pulse" />
          <div className="h-28 rounded-md bg-muted animate-pulse" />
          <div className="h-28 rounded-md bg-muted animate-pulse" />
          <div className="h-28 rounded-md bg-muted animate-pulse" />
        </div>
      )}
      {isError && (
        <div className="text-sm text-destructive">Failed to load stats</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number((stats && stats.totalUsers) || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +12%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{Number((stats && stats.walletBalance) || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +5.2%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number((stats && stats.totalTransactions) || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +18%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{Number((stats && stats.todaySales) || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +8%
              </span>
              from yesterday
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Transaction Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {chartData.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No transactions in the last 7 days</div>
            ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₦${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-6">
              {recent.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${transaction.status === 'success' ? 'bg-emerald-100 text-emerald-600' : transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                      {transaction.status === 'success' ? <ArrowUpRight className="h-4 w-4" /> : transaction.status === 'pending' ? <Activity className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{transaction.user || transaction.user_email || transaction.userEmail || transaction.userId || "System"}</p>
                      <p className="text-xs text-muted-foreground mt-1">{transaction.type} • {new Date(transaction.createdAt ? (transaction.createdAt._seconds ? transaction.createdAt._seconds * 1000 : transaction.createdAt) : Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="font-medium text-sm">
                    {transaction.status === 'failed' ? '-' : '+'}₦{transaction.amount.toLocaleString()}
                  </div>
                </div>
              ))}
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
