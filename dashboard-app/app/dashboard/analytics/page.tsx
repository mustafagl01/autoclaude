/**
 * Analytics Page
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Displays interactive charts and analytics for phone call data.
 * Includes call volume trends, outcome distribution, peak hours, and date range filtering.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/server-components
 * @see /lib/db.ts - Database query functions
 * @see /components/AnalyticsChart.tsx - Chart visualization component
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AnalyticsChart from '@/components/AnalyticsChart'
import type { Call } from '@/lib/db'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Date range filter state
 */
interface DateRange {
  startDate: string
  endDate: string
}

// ============================================================================
// Client Component - Analytics Page
// ============================================================================

/**
 * Analytics Page Component
 *
 * Client component that displays interactive charts and analytics for phone call data.
 * Requires authenticated session via NextAuth.js.
 *
 * Features:
 * - Call volume trends over time (line chart)
 * - Call outcome distribution (pie chart)
 * - Peak hours heatmap
 * - Date range filtering
 * - Responsive design
 * - Dark mode support
 * - Real-time data updates
 *
 * @returns Analytics page JSX or redirects to login
 *
 * @example
 * // Access at http://localhost:3000/dashboard/analytics
 * // Requires valid authentication session
 */
export default function AnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // State for call data and filters
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date range filter state (default: last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getLast30DaysDate(),
    endDate: new Date().toISOString().split('T')[0],
  })

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch call data when date range or session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchCalls()
    }
  }, [dateRange, session])

  /**
   * Fetch calls from API with date range filter
   */
  async function fetchCalls() {
    if (!session?.user?.id) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      })

      const response = await fetch(`/api/analytics/calls?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const data = await response.json()

      if (data.success && data.data) {
        setCalls(data.data.calls || [])
      } else {
        throw new Error(data.error || 'Failed to fetch analytics data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle date range form submission
   */
  function handleDateRangeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    fetchCalls()
  }

  /**
   * Handle preset date range buttons
   */
  function setPresetRange(days: number) {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    })
  }

  // Calculate additional analytics metrics
  const metrics = calculateAnalyticsMetrics(calls)

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent dark:border-blue-400 dark:border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Visualize your phone call trends and patterns
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Date Range Filter
          </h2>

          <form onSubmit={handleDateRangeSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {loading ? 'Loading...' : 'Apply Filter'}
                </button>
              </div>
            </div>

            {/* Preset Range Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Quick select:</span>
              <button
                type="button"
                onClick={() => setPresetRange(7)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Last 7 days
              </button>
              <button
                type="button"
                onClick={() => setPresetRange(30)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Last 30 days
              </button>
              <button
                type="button"
                onClick={() => setPresetRange(90)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Last 90 days
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Metrics */}
        {calls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Calls"
              value={metrics.totalCalls}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              }
              color="blue"
            />
            <MetricCard
              title="Completed"
              value={metrics.completedCalls}
              subtitle={`${metrics.completionRate.toFixed(1)}%`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="green"
            />
            <MetricCard
              title="Avg Duration"
              value={`${metrics.avgDuration}s`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="purple"
            />
            <MetricCard
              title="Peak Hour"
              value={metrics.peakHour}
              subtitle={metrics.peakHourCount > 0 ? `${metrics.peakHourCount} calls` : 'No data'}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="orange"
            />
          </div>
        )}

        {/* Charts */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent dark:border-blue-400 dark:border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading charts...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No data available</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting the date range filter to see analytics data.
            </p>
          </div>
        ) : (
          <AnalyticsChart calls={calls} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date 30 days ago in YYYY-MM-DD format
 */
function getLast30DaysDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().split('T')[0]
}

/**
 * Calculate analytics metrics from call data
 */
function calculateAnalyticsMetrics(calls: Call[]) {
  const totalCalls = calls.length
  const completedCalls = calls.filter(c => c.status === 'completed').length
  const avgDuration = totalCalls > 0
    ? calls.reduce((sum, c) => sum + (c.duration || 0), 0) / totalCalls
    : 0
  const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0

  // Calculate peak hour
  const hourCounts: Record<number, number> = {}
  calls.forEach(call => {
    const hour = new Date(call.call_date).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  let peakHour = 'N/A'
  let peakHourCount = 0
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > peakHourCount) {
      peakHourCount = count
      peakHour = `${hour}:00`
    }
  })

  return {
    totalCalls,
    completedCalls,
    avgDuration: Math.round(avgDuration),
    completionRate,
    peakHour,
    peakHourCount,
  }
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Metric Card Props
 */
interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'orange'
}

/**
 * Metric Card Component
 *
 * Displays a single analytics metric with icon, value, and optional subtitle.
 *
 * @param props - Metric card props
 * @returns Metric card JSX
 */
function MetricCard({ title, value, subtitle, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-400',
  }

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs opacity-70">{subtitle}</p>
          )}
        </div>
        <div className="flex-shrink-0 ml-3 opacity-80">{icon}</div>
      </div>
    </div>
  )
}
