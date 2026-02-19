'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

/**
 * Providers Props
 *
 * @param children - Child components to be wrapped with providers
 * @param session - NextAuth session object (optional)
 */
interface ProvidersProps {
  children: ReactNode
  session?: unknown
}

/**
 * Providers Component
 *
 * Wraps the application with necessary context providers.
 * Currently includes:
 * - SessionProvider: Manages NextAuth authentication session
 *
 * This is a client component that should be used in the root layout
 * to provide authentication context to all child components.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx (Server Component)
 * import { getServerSession } from 'next-auth'
 * import Providers from './providers'
 *
 * export default async function Layout({ children }) {
 *   const session = await getServerSession()
 *   return (
 *     <html>
 *       <body>
 *         <Providers session={session}>
 *           {children}
 *         </Providers>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export default function Providers({ children, session }: ProvidersProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
