import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllTransactions } from "@/lib/backend";

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const tx = await getAllTransactions();
        if (!mounted) return;
        const mapped = (tx || []).map((t: any) => ({
          id: t.id,
          action: t.type || "transaction",
          user: t.user || t.user_email || t.userEmail || t.email || t.userId || "System",
          status: t.status || "success",
          timestamp: t.createdAt || t.created_at || Date.now(),
          ip: "",
          amount: t.amount || 0,
        }));
        setLogs(mapped);
      } catch {
        if (!mounted) return;
        setLogs([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">System Logs</h2>
        <p className="text-muted-foreground">Audit trail of system activities and security events.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system logs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(
                      (typeof log.timestamp === 'number')
                        ? log.timestamp
                        : (log.timestamp?._seconds
                          ? log.timestamp._seconds * 1000
                          : log.timestamp || Date.now())
                    ).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                           className={log.status === 'success' ? 'bg-emerald-500' : log.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">₦{Number(log.amount || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
