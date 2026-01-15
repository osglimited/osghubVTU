import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, Tv, Zap, Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllPlans, createPlan, updatePlan, deletePlan } from "@/lib/backend";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState("airtime");
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      setLoadingPlans(true);
      try {
        const data = await getAllPlans();
        if (!mounted) return;
        setPlans(data);
      } catch (e: any) {
        toast({ title: "Failed to load plans", description: e.message || "Unable to fetch plans", variant: "destructive" });
      } finally {
        if (mounted) setLoadingPlans(false);
      }
    };
    loadPlans();
    return () => { mounted = false; };
  }, []);

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
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20">
                  <Plus className="mr-2 h-4 w-4" /> Add Data Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Create Data Plan</DialogTitle>
                </DialogHeader>
                <NewPlanForm
                  onCreated={(plan) => {
                    setPlans((prev) => [plan, ...prev]);
                    setOpenNew(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Data Plans</CardTitle>
              <CardDescription>Manage data plans and pricing.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPlans ? (
                <div className="p-6 text-sm text-muted-foreground">Loading plans...</div>
              ) : (
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
                    {plans.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.network}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>₦{Number(p.priceUser || 0).toLocaleString()}</TableCell>
                        <TableCell>₦{Number(p.priceApi || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {p.active ? (
                            <Badge className="bg-emerald-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const priceUser = Number(prompt("New user price (₦)", String(p.priceUser)) || "");
                              const priceApi = Number(prompt("New API price (₦)", String(p.priceApi)) || "");
                              try {
                                const updated = await updatePlan(p.id, {
                                  priceUser: isNaN(priceUser) ? undefined : priceUser,
                                  priceApi: isNaN(priceApi) ? undefined : priceApi,
                                });
                                setPlans((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
                                toast({ title: "Plan updated", description: `${updated.network} ${updated.name}` });
                              } catch (e: any) {
                                toast({ title: "Update failed", description: e.message || "Unable to update", variant: "destructive" });
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={async () => {
                              const confirmDelete = confirm(`Delete plan ${p.network} ${p.name}?`);
                              if (!confirmDelete) return;
                              try {
                                await deletePlan(p.id);
                                setPlans((prev) => prev.filter((x) => x.id !== p.id));
                                toast({ title: "Plan deleted", description: `${p.network} ${p.name}` });
                              } catch (e: any) {
                                toast({ title: "Delete failed", description: e.message || "Unable to delete", variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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

function NewPlanForm({ onCreated }: { onCreated: (plan: any) => void }) {
  const { toast } = useToast();
  const [network, setNetwork] = useState("");
  const [name, setName] = useState("");
  const [priceUser, setPriceUser] = useState("");
  const [priceApi, setPriceApi] = useState("");
  const [active, setActive] = useState(true);
  const [variationId, setVariationId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-4">
      <Label>Network</Label>
      <Input placeholder="MTN / Glo / Airtel / 9mobile" value={network} onChange={e => setNetwork(e.target.value)} />
      <Label>Plan Name</Label>
      <Input placeholder="1GB SME" value={name} onChange={e => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Price (User)</Label>
          <Input type="number" placeholder="0" value={priceUser} onChange={e => setPriceUser(e.target.value)} />
        </div>
        <div>
          <Label>Price (API)</Label>
          <Input type="number" placeholder="0" value={priceApi} onChange={e => setPriceApi(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Provider Variation ID</Label>
          <Input placeholder="e.g. 349" value={variationId} onChange={e => setVariationId(e.target.value)} />
        </div>
        <div>
          <Label>Network ID</Label>
          <Input type="number" placeholder="1=MTN,2=Glo,4=Airtel,3=9mobile" value={networkId} onChange={e => setNetworkId(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={active} onCheckedChange={setActive} />
        <Label>Active</Label>
      </div>
      <div className="flex justify-end">
        <Button
          disabled={saving}
          onClick={async () => {
            if (!network || !name || !priceUser || !priceApi || !variationId || !networkId) {
              toast({ title: "Missing fields", description: "Provide all fields including provider mapping", variant: "destructive" });
              return;
            }
            setSaving(true);
            try {
              const plan = await createPlan({ network, name, priceUser: Number(priceUser), priceApi: Number(priceApi), active, metadata: { variation_id: variationId, networkId: Number(networkId) } });
              toast({ title: "Plan created", description: `${plan.network} ${plan.name}` });
              onCreated(plan);
            } catch (e: any) {
              toast({ title: "Create failed", description: e.message || "Unable to create", variant: "destructive" });
            } finally {
              setSaving(false);
            }
          }}
        >
          Create Plan
        </Button>
      </div>
    </div>
  );
}
