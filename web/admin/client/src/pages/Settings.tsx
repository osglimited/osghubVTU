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
  const [form, setForm] = useState<any>({
    providerBaseUrl: '',
    apiKey: '',
    secretKey: '',
    cashbackEnabled: false,
    dailyReferralBudget: 0,
    smsEnabled: true,
    smsCharge: 5,
    smsServices: { airtime: true, data: true, electricity: true, cable: true, exam: true },
    smsBalanceCodes: {
      AIRTIME: '*310#',
      DATA: '*323#',
      MTN_AIRTIME: '',
      MTN_DATA: '',
      AIRTEL_AIRTIME: '',
      AIRTEL_DATA: '',
      GLO_AIRTIME: '',
      GLO_DATA: '',
      '9MOBILE_AIRTIME': '',
      '9MOBILE_DATA': ''
    }
  });

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
          dailyReferralBudget: Number(s.dailyReferralBudget || 0),
          smsEnabled: s.sms?.enabled !== false,
          smsCharge: s.sms?.charge !== undefined ? Number(s.sms.charge) : prev.smsCharge,
          smsServices: {
            airtime: s.sms?.services?.airtime !== false,
            data: s.sms?.services?.data !== false,
            electricity: s.sms?.services?.electricity !== false,
            cable: s.sms?.services?.cable !== false,
            exam: s.sms?.services?.exam !== false
          },
          smsBalanceCodes: {
            AIRTIME: s.sms?.balanceCodes?.AIRTIME || prev.smsBalanceCodes.AIRTIME,
            DATA: s.sms?.balanceCodes?.DATA || prev.smsBalanceCodes.DATA,
            MTN_AIRTIME: s.sms?.balanceCodes?.MTN_AIRTIME || '',
            MTN_DATA: s.sms?.balanceCodes?.MTN_DATA || '',
            AIRTEL_AIRTIME: s.sms?.balanceCodes?.AIRTEL_AIRTIME || '',
            AIRTEL_DATA: s.sms?.balanceCodes?.AIRTEL_DATA || '',
            GLO_AIRTIME: s.sms?.balanceCodes?.GLO_AIRTIME || '',
            GLO_DATA: s.sms?.balanceCodes?.GLO_DATA || '',
            '9MOBILE_AIRTIME': s.sms?.balanceCodes?.['9MOBILE_AIRTIME'] || '',
            '9MOBILE_DATA': s.sms?.balanceCodes?.['9MOBILE_DATA'] || ''
          }
        }));
      } catch {
        // ignore
      }
    };
    load();
    return () => { mounted = false; };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">API Integration Settings</h2>
        <p className="text-muted-foreground">Manage your VTU provider API keys and configurations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>SMS Configuration</CardTitle>
            <CardDescription>Manage SMS notifications, charges, per-service toggles, and balance codes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2 border p-3 rounded-md">
              <div className="space-y-0.5">
                <Label className="text-base">Enable SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Send SMS for successful transactions.</p>
              </div>
              <input
                type="checkbox"
                checked={form.smsEnabled}
                onChange={e => setForm((p: any) => ({ ...p, smsEnabled: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label>SMS Charge (₦)</Label>
              <Input
                type="number"
                value={form.smsCharge}
                onChange={e => setForm((p: any) => ({ ...p, smsCharge: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Deducted from user wallet per SMS.</p>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Per-Service SMS Toggles</Label>
                <div className="flex items-center justify-between border p-2 rounded">
                  <span>Airtime</span>
                  <input type="checkbox" checked={form.smsServices.airtime} onChange={e => setForm((p: any) => ({ ...p, smsServices: { ...p.smsServices, airtime: e.target.checked } }))} />
                </div>
                <div className="flex items-center justify-between border p-2 rounded">
                  <span>Data</span>
                  <input type="checkbox" checked={form.smsServices.data} onChange={e => setForm((p: any) => ({ ...p, smsServices: { ...p.smsServices, data: e.target.checked } }))} />
                </div>
                <div className="flex items-center justify-between border p-2 rounded">
                  <span>Electricity</span>
                  <input type="checkbox" checked={form.smsServices.electricity} onChange={e => setForm((p: any) => ({ ...p, smsServices: { ...p.smsServices, electricity: e.target.checked } }))} />
                </div>
                <div className="flex items-center justify-between border p-2 rounded">
                  <span>Cable</span>
                  <input type="checkbox" checked={form.smsServices.cable} onChange={e => setForm((p: any) => ({ ...p, smsServices: { ...p.smsServices, cable: e.target.checked } }))} />
                </div>
                <div className="flex items-center justify-between border p-2 rounded">
                  <span>Exam Pins</span>
                  <input type="checkbox" checked={form.smsServices.exam} onChange={e => setForm((p: any) => ({ ...p, smsServices: { ...p.smsServices, exam: e.target.checked } }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Balance Codes (USSD)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Generic AIRTIME</Label>
                    <Input value={form.smsBalanceCodes.AIRTIME} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, AIRTIME: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Generic DATA</Label>
                    <Input value={form.smsBalanceCodes.DATA} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, DATA: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>MTN AIRTIME</Label>
                    <Input value={form.smsBalanceCodes.MTN_AIRTIME} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, MTN_AIRTIME: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>MTN DATA</Label>
                    <Input value={form.smsBalanceCodes.MTN_DATA} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, MTN_DATA: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Airtel AIRTIME</Label>
                    <Input value={form.smsBalanceCodes.AIRTEL_AIRTIME} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, AIRTEL_AIRTIME: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Airtel DATA</Label>
                    <Input value={form.smsBalanceCodes.AIRTEL_DATA} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, AIRTEL_DATA: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Glo AIRTIME</Label>
                    <Input value={form.smsBalanceCodes.GLO_AIRTIME} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, GLO_AIRTIME: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Glo DATA</Label>
                    <Input value={form.smsBalanceCodes.GLO_DATA} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, GLO_DATA: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>9mobile AIRTIME</Label>
                    <Input value={form.smsBalanceCodes['9MOBILE_AIRTIME']} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, ['9MOBILE_AIRTIME']: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>9mobile DATA</Label>
                    <Input value={form.smsBalanceCodes['9MOBILE_DATA']} onChange={e => setForm((p: any) => ({ ...p, smsBalanceCodes: { ...p.smsBalanceCodes, ['9MOBILE_DATA']: e.target.value } }))} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                secretKey: form.secretKey,
                sms: {
                  enabled: form.smsEnabled,
                  charge: Number(form.smsCharge),
                  services: {
                    airtime: !!form.smsServices.airtime,
                    data: !!form.smsServices.data,
                    electricity: !!form.smsServices.electricity,
                    cable: !!form.smsServices.cable,
                    exam: !!form.smsServices.exam
                  },
                  balanceCodes: {
                    AIRTIME: String(form.smsBalanceCodes.AIRTIME || '').trim(),
                    DATA: String(form.smsBalanceCodes.DATA || '').trim(),
                    MTN_AIRTIME: String(form.smsBalanceCodes.MTN_AIRTIME || '').trim(),
                    MTN_DATA: String(form.smsBalanceCodes.MTN_DATA || '').trim(),
                    AIRTEL_AIRTIME: String(form.smsBalanceCodes.AIRTEL_AIRTIME || '').trim(),
                    AIRTEL_DATA: String(form.smsBalanceCodes.AIRTEL_DATA || '').trim(),
                    GLO_AIRTIME: String(form.smsBalanceCodes.GLO_AIRTIME || '').trim(),
                    GLO_DATA: String(form.smsBalanceCodes.GLO_DATA || '').trim(),
                    '9MOBILE_AIRTIME': String(form.smsBalanceCodes['9MOBILE_AIRTIME'] || '').trim(),
                    '9MOBILE_DATA': String(form.smsBalanceCodes['9MOBILE_DATA'] || '').trim()
                  }
                }
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
