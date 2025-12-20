import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import Notification from '@/components/Notification'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'),
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
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={`${inter.className} bg-background-light dark:bg-background-dark`}>
        <NotificationProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <Notification />
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  )
}
