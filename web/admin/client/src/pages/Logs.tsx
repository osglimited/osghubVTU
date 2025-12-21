import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const mockLogs = [
  { id: 1, action: "Admin Login", user: "admin@osghub.com", ip: "192.168.1.1", status: "success", timestamp: "2025-03-10T12:00:00" },
  { id: 2, action: "Wallet Adjustment", user: "admin@osghub.com", ip: "192.168.1.1", status: "success", timestamp: "2025-03-10T11:45:00" },
  { id: 3, action: "API Key Update", user: "admin@osghub.com", ip: "192.168.1.1", status: "warning", timestamp: "2025-03-09T09:30:00" },
  { id: 4, action: "Failed Login Attempt", user: "unknown", ip: "45.32.11.2", status: "error", timestamp: "2025-03-08T22:15:00" },
];

export default function LogsPage() {
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
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>{log.user}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ip}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}
                           className={log.status === 'success' ? 'bg-emerald-500' : log.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
