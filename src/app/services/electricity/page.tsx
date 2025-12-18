'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Zap } from 'lucide-react';

export default function ElectricityPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container-main py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-[#0A1F44] mb-4 flex items-center gap-3">
            <Zap size={40} className="text-[#F97316]" />
            Pay Electricity Bill
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Instant payment for prepaid and postpaid electricity meters.
          </p>

          <div className="card space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Disco</label>
              <select className="input-field">
                <option>IKEDC</option>
                <option>EKEDC</option>
                <option>AEDC</option>
                <option>BENDC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meter Number</label>
              <input type="text" placeholder="Enter meter number" className="input-field" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input type="number" placeholder="Enter amount" className="input-field" />
            </div>

            <button className="btn-accent w-full">
              Pay Bill
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
