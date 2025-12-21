import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function ApiSettingsPage() {
  const [showKey, setShowKey] = useState(false);

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
              <Input defaultValue="https://api.vtuprovider.com/v1" />
            </div>
            
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input 
                  type={showKey ? "text" : "password"} 
                  defaultValue="sk_live_1234567890abcdef" 
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
              <Input type="password" defaultValue="**********************" />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t py-4">
            <Button className="ml-auto">
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
                <Button variant="outline">Copy</Button>
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
