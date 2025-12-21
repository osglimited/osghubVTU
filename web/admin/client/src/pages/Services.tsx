import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, Tv, Zap, Edit, Trash2, Plus } from "lucide-react";

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState("airtime");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Service Management</h2>
        <p className="text-muted-foreground">Manage VTU services, plans, and pricing.</p>
      </div>

      <Tabs defaultValue="airtime" onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="airtime"><Smartphone className="mr-2 h-4 w-4" /> Airtime</TabsTrigger>
          <TabsTrigger value="data"><Wifi className="mr-2 h-4 w-4" /> Data</TabsTrigger>
          <TabsTrigger value="cable"><Tv className="mr-2 h-4 w-4" /> Cable</TabsTrigger>
          <TabsTrigger value="electricity"><Zap className="mr-2 h-4 w-4" /> Power</TabsTrigger>
        </TabsList>

        {/* Airtime Content */}
        <TabsContent value="airtime" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Airtime Networks</CardTitle>
              <CardDescription>Enable or disable airtime for specific networks and set discounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Discount (%)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['MTN', 'Airtel', 'Glo', '9mobile'].map((network) => (
                    <TableRow key={network}>
                      <TableCell className="font-medium">{network}</TableCell>
                      <TableCell>2%</TableCell>
                      <TableCell>
                        <Switch checked={true} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Content */}
        <TabsContent value="data" className="space-y-4">
          <div className="flex justify-end">
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add Data Plan
            </Button>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Data Plans</CardTitle>
              <CardDescription>Manage data plans and pricing.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Price (User)</TableHead>
                    <TableHead>Price (API)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>MTN</TableCell>
                    <TableCell>1GB SME</TableCell>
                    <TableCell>₦250</TableCell>
                    <TableCell>₦230</TableCell>
                    <TableCell><Badge className="bg-emerald-500">Active</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Glo</TableCell>
                    <TableCell>5GB Corporate</TableCell>
                    <TableCell>₦1200</TableCell>
                    <TableCell>₦1100</TableCell>
                    <TableCell><Badge className="bg-emerald-500">Active</Badge></TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cable Content */}
        <TabsContent value="cable" className="space-y-4">
           <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Cable TV Packages</CardTitle>
              <CardDescription>Manage DSTV, GOTV, and Startimes packages.</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground">Cable TV package management UI would go here similar to Data Plans.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Electricity Content */}
        <TabsContent value="electricity" className="space-y-4">
           <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Electricity Discos</CardTitle>
              <CardDescription>Manage supported electricity distribution companies.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Electricity provider management UI would go here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
