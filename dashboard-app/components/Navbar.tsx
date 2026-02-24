'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

/**
 * Navigation link definition
 */
interface NavLink {
  href: string
  label: string
  description?: string
}

/**
 * Navbar Props
 *
 * @param className - Additional CSS classes to apply to the navbar container
 */
export interface NavbarProps {
  className?: string
}

/**
 * Navbar Component
 *
 * Main navigation bar for the dashboard application.
 * Displays user information, navigation links, and logout functionality.
 *
 * Features:
 * - User name and profile picture display
 * - Navigation links: Dashboard, Calls, Analytics, Profile
 * - Logout button with loading state
 * - Mobile-responsive hamburger menu
 * - Dark mode support
 * - Active link highlighting
 * - Accessible navigation with ARIA attributes
 *
 * @example
 * ```tsx
 * <Navbar />
 * ```
 *
 * @example
 * ```tsx
 * <Navbar className="border-b border-gray-200" />
 * ```
 */
export default function Navbar({ className = '' }: NavbarProps) {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  /**
   * Navigation links configuration
   */
  const navLinks: NavLink[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      description: 'Overview and metrics',
    },
    {
      href: '/orders',
      label: 'Siparişler',
      description: 'Tüm siparişler',
    },
    {
      href: '/dashboard/calls',
      label: 'Calls',
      description: 'Phone call history',
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      description: 'Performance insights',
    },
    {
      href: '/settings/integrations',
      label: 'Entegrasyonlar',
      description: 'HubRise ve diğer bağlantılar',
    },
    {
      href: '/dashboard/profile',
      label: 'Profile',
      description: 'Account settings',
    },
  ]

  /**
   * Handle user logout
   * Redirects to home page after successful logout
   */
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)

      // Sign out from NextAuth session
      await signOut({
        callbackUrl: '/',
        redirect: true,
      })
    } catch (error) {
      // Log error but still attempt to redirect
      setIsLoggingOut(false)
    }
  }

  /**
   * Get user display name
   * Falls back to email if name is not available
   */
  const getDisplayName = (): string => {
    if (!session?.user) {
      return 'Loading...'
    }

    if (session.user.name) {
      return session.user.name
    }

    if (session.user.email) {
      // Extract name from email (before @)
      return session.user.email.split('@')[0]
    }

    return 'User'
  }

  /**
   * Get user initials for avatar fallback
   */
  const getUserInitials = (): string => {
    const displayName = getDisplayName()

    // Get first letter of each word
    return displayName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  /**
   * Check if a link is currently active
   */
  const isActiveLink = (href: string): boolean => {
    if (typeof window === 'undefined') {
      return false
    }

    const pathname = window.location.pathname

    // Exact match for dashboard home
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }

    // Prefix match for other routes
    return pathname.startsWith(href)
  }

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <nav
        className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav
      className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">
                Takeaway Dashboard
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActiveLink(link.href)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={link.description}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu and Logout */}
          <div className="hidden md:flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={getDisplayName()}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getUserInitials()
                )}
              </div>

              {/* User Name */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getDisplayName()}
                </span>
                {session?.user?.email && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {session.user.email}
                  </span>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign out"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="true"
              aria-label="Open main menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Mobile Navigation Links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActiveLink(link.href) ? 'page' : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActiveLink(link.href)
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile User Info and Logout */}
          <div className="px-4 pt-4 pb-4 border-t border-gray-200 dark:border-gray-700">
            {/* User Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={getDisplayName()}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getUserInitials()
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getDisplayName()}
                </span>
                {session?.user?.email && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {session.user.email}
                  </span>
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
