import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#0A1F44] text-white py-12 mt-20">
      <div className="container-main">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-4">OSGHUB VTU</h3>
            <p className="text-gray-300 text-sm">
              Your trusted platform for instant digital services
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="#" className="hover:text-white">Airtime</Link></li>
              <li><Link href="#" className="hover:text-white">Data</Link></li>
              <li><Link href="#" className="hover:text-white">Cable TV</Link></li>
              <li><Link href="#" className="hover:text-white">Electricity</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="#" className="hover:text-white">About Us</Link></li>
              <li><Link href="#" className="hover:text-white">Contact</Link></li>
              <li><Link href="#" className="hover:text-white">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <p className="text-sm text-gray-300">support@osghub.com</p>
            <p className="text-sm text-gray-300">+234 800 123 4567</p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} OSGHUB VTU. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
