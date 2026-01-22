import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getSmsHistory } from "@/lib/backend";
import { format } from "date-fns";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SMSHistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getSmsHistory(100);
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to load SMS logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">SMS History</h2>
          <p className="text-muted-foreground">View log of sent SMS notifications and costs.</p>
        </div>
        <Button variant="outline" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Recent SMS Logs
          </CardTitle>
          <CardDescription>Displaying last 100 SMS notifications sent.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Transaction Ref</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[300px]">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No SMS logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id || Math.random()}>
                      <TableCell className="whitespace-nowrap">
                        {log.createdAt ? (
                          typeof log.createdAt === 'string' 
                            ? new Date(log.createdAt).toLocaleString() 
                            : (log.createdAt.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'N/A')
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{log.phone}</TableCell>
                      <TableCell className="uppercase text-xs font-medium">{log.serviceType}</TableCell>
                      <TableCell className="font-mono text-xs">{log.transactionId}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        {log.cost ? `-₦${log.cost}` : '₦0'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className={log.status === 'sent' ? 'bg-green-600 hover:bg-green-700' : ''}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={log.message}>
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
