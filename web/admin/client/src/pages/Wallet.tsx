import { mockWalletRequests } from "@/lib/firebase";
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

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Wallet Management</h2>
          <p className="text-muted-foreground">Manage funding requests and manual adjustments.</p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Requests
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">5</div>
            <p className="text-xs opacity-70 mt-1">Total value: ₦25,000</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">Total value: ₦150,000</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Funded (Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₦4.5M</div>
            <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
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
                  {mockWalletRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.id}</TableCell>
                      <TableCell className="font-medium">{request.user}</TableCell>
                      <TableCell>₦{request.amount.toLocaleString()}</TableCell>
                      <TableCell>{request.method}</TableCell>
                      <TableCell>{new Date(request.date).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'approved' ? 'default' : 'secondary'} className={request.status === 'approved' ? 'bg-emerald-500' : request.status === 'pending' ? 'bg-amber-500' : ''}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
                  <Input placeholder="Enter user email..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₦)</label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <Input placeholder="Bonus / Refund / Correction" />
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Credit Wallet</Button>
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
                  <Input placeholder="Enter user email..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (₦)</label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <Input placeholder="Correction / Penalty" />
                </div>
                <Button variant="destructive" className="w-full">Debit Wallet</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
