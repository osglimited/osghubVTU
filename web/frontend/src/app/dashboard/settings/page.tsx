'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [smsAlerts, setSmsAlerts] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#0A1F44]">Settings</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[#0A1F44]">Preferences</h2>
          <p className="text-sm text-gray-500">Configure how your dashboard behaves.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-[#0A1F44]">Enable notifications</Label>
              <p className="text-xs text-gray-500">Receive updates about transactions and account activity.</p>
            </div>
            <Checkbox checked={notifications} onCheckedChange={(v) => setNotifications(Boolean(v))} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#0A1F44]">Theme</Label>
              <select
                className="input-field mt-2"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <Label className="text-[#0A1F44]">SMS Alerts Number</Label>
              <Input placeholder="Enter phone number" />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox checked={smsAlerts} onCheckedChange={(v) => setSmsAlerts(Boolean(v))} />
                <span className="text-sm text-gray-600">Enable SMS alerts</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="bg-[#F97316] hover:bg-[#ea6d0f]">Save changes</Button>
        </div>
      </div>
    </div>
  );
}
