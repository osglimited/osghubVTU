import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OSGHUB VTU - Instant Digital Services',
  description: 'Buy airtime, data, electricity and more instantly with OSGHUB VTU',
  openGraph: {
    title: 'OSGHUB VTU',
    description: 'Instant digital services platform',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#F8FAFC]`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
