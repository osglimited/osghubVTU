import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminSettings, updateAdminSettings } from "@/lib/backend";
import { useToast } from "@/hooks/use-toast";

export default function ApiSettingsPage() {
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ providerBaseUrl: '', apiKey: '', secretKey: '', cashbackEnabled: false, dailyReferralBudget: 0 });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const s = await getAdminSettings();
        if (!mounted) return;
        setForm((prev: any) => ({
          ...prev,
          providerBaseUrl: s.providerBaseUrl || '',
          apiKey: s.apiKey || '',
          secretKey: s.secretKey || '',
          cashbackEnabled: !!s.cashbackEnabled,
          dailyReferralBudget: Number(s.dailyReferralBudget || 0)
        }));
      } catch {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">API Integration Settings</h2>
        <p className="text-muted-foreground">Manage your VTU provider API keys and configurations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>VTU Provider Configuration</CardTitle>
            <CardDescription>Set up the connection to your upstream VTU provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider Base URL</Label>
              <Input value={form.providerBaseUrl} onChange={e => setForm((p: any) => ({ ...p, providerBaseUrl: e.target.value }))} />
            </div>
            
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input 
                  type={showKey ? "text" : "password"} 
                  value={form.apiKey}
                  onChange={e => setForm((p: any) => ({ ...p, apiKey: e.target.value }))}
                  className="pr-10"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Secret Key</Label>
              <Input type="password" value={form.secretKey} onChange={e => setForm((p: any) => ({ ...p, secretKey: e.target.value }))} />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
            <Button className="ml-auto" onClick={async () => {
              const payload = {
                cashbackEnabled: !!form.cashbackEnabled,
                dailyReferralBudget: Number(form.dailyReferralBudget || 0),
                pricing: {}, // extend later
                providerBaseUrl: form.providerBaseUrl,
                apiKey: form.apiKey,
                secretKey: form.secretKey
              };
              const res = await updateAdminSettings(payload);
              toast({ title: 'Settings Saved', description: res.message || 'Updated' });
            }}>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-none shadow-sm md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
            <CardDescription>Provide this URL to your provider for instant updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value="https://osghub.com/api/webhook" className="bg-muted" />
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText("https://osghub.com/api/webhook");
                  toast({ title: "Copied", description: "Webhook URL copied to clipboard" });
                }}>Copy</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This URL receives transaction status updates from your provider.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
