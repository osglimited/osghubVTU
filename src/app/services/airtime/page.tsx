'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Smartphone } from 'lucide-react';

export default function AirtimePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
            <Smartphone size={40} className="text-[#F97316]" />
            Buy Airtime
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Instant airtime for MTN, Glo, Airtel, and 9mobile at the best rates.
          </p>

          <div className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Network</label>
              <select className="input-field">
                <option>MTN</option>
                <option>Glo</option>
                <option>Airtel</option>
                <option>9mobile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input type="tel" placeholder="+234..." className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <select className="input-field">
                <option>₦500</option>
                <option>₦1,000</option>
                <option>₦5,000</option>
                <option>₦10,000</option>
              </select>
            </div>

            <button className="btn-accent w-full">
              Buy Airtime
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
