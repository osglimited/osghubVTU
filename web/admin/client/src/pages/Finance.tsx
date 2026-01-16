import { useQuery } from "@tanstack/react-query";
import { getFinanceSystem } from "@/lib/backend";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";

export default function FinancePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["finance-system"],
    queryFn: async () => await getFinanceSystem(),
    refetchInterval: 10000,
    staleTime: 8000,
  });
  const daily = data?.daily || { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 };
  const weekly = data?.weekly || { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 };
  const monthly = data?.monthly || { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 };
  const requiredProviderBalance = Number(data?.requiredProviderBalance || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Financial Intelligence</h2>
            <p className="text-muted-foreground">System-wide analytics from real transaction data.</p>
          </div>
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
    </div>
  );
}
