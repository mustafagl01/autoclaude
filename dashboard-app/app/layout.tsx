import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import './globals.css'
import Providers from './providers'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UK Takeaway Dashboard',
  description: 'Phone order assistant dashboard for UK takeaway businesses',
}

/**
 * Root Layout Component
 *
 * Main layout wrapper for the entire application.
 * - Provides NextAuth session context via Providers component
 * - Conditionally renders Navbar on authenticated pages (/dashboard routes)
 * - Applies global font configuration and CSS
 *
 * @param children - Child pages and components
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get server session for authentication state
  const session = await getServerSession()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers session={session}>
          {/* Conditionally render Navbar only on authenticated dashboard routes */}
          {session && <Navbar />}
          <main className={session ? 'pt-0' : ''}>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
