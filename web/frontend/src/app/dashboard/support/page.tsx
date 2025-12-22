'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextareaHTMLAttributes, useState } from 'react';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[#0A1F44]">Support</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-[#0A1F44]">Contact Support</h2>
          <p className="text-sm text-gray-500">Describe your issue and we’ll get back to you.</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[#0A1F44]">Subject</Label>
            <Input
              className="mt-2"
              placeholder="Brief summary of your issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-[#0A1F44]">Message</Label>
            <textarea
              className="input-field mt-2 h-40 resize-y"
              placeholder="Provide details to help us resolve your issue"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="bg-[#F97316] hover:bg-[#ea6d0f]" disabled={!subject || !message}>
            Submit Ticket
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-[#0A1F44]">Helpful Links</h2>
        <ul className="mt-3 text-sm text-gray-600 space-y-2 list-disc pl-6">
          <li>Transaction issues</li>
          <li>Wallet funding</li>
          <li>PIN & security</li>
          <li>Account verification</li>
        </ul>
      </div>
    </div>
  );
}
