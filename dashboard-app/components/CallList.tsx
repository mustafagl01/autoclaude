'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Call } from '@/lib/db'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Call filter options
 */
export interface CallFilters {
  startDate?: string
  endDate?: string
  status?: string
  phoneNumber?: string
}

/**
 * Pagination state
 */
interface PaginationState {
  page: number
  limit: number
  total: number
}

/**
 * Call List Props
 *
 * @param initialCalls - Initial array of calls to display
 * @param initialTotal - Total number of calls (for pagination)
 * @param userId - User ID for fetching filtered calls
 */
export interface CallListProps {
  initialCalls: Call[]
  initialTotal: number
  userId: string
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Call List Component
 *
 * Displays a paginated list of phone calls with filtering and search capabilities.
 * Features include date range filtering, status filtering, phone number search,
 * and pagination controls.
 *
 * Features:
 * - Pagination (25 calls per page)
 * - Date range filter
 * - Status filter (completed, missed, failed, in_progress, cancelled)
 * - Phone number search
 * - Responsive table layout
 * - Dark mode support
 * - Loading states
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <CallList
 *   initialCalls={calls}
 *   initialTotal={totalCalls}
 *   userId={session.user.id}
 * />
 * ```
 */
export default function CallList({ initialCalls, initialTotal, userId }: CallListProps) {
  // State management
  const [calls, setCalls] = useState<Call[]>(initialCalls)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 25,
    total: initialTotal,
  })
  const [filters, setFilters] = useState<CallFilters>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state for filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  /**
   * Fetch calls with filters and pagination
   */
  const fetchCalls = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query parameters
      const params = new URLSearchParams({
        userId,
        limit: pagination.limit.toString(),
        offset: ((pagination.page - 1) * pagination.limit).toString(),
      })

      if (filters.startDate) {
        params.append('startDate', filters.startDate)
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate)
      }

      if (filters.status) {
        params.append('status', filters.status)
      }

      if (filters.phoneNumber) {
        params.append('phoneNumber', filters.phoneNumber)
      }

      // Fetch filtered calls from API
      const response = await fetch(`/api/calls?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch calls')
      }

      const data = await response.json()

      if (data.success) {
        setCalls(data.data.calls)
        setPagination((prev) => ({ ...prev, total: data.data.total }))
      } else {
        throw new Error(data.error || 'Failed to fetch calls')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setCalls([])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Apply filters and reset to first page
   */
  const handleApplyFilters = () => {
    const newFilters: CallFilters = {}

    if (startDate) {
      newFilters.startDate = startDate
    }

    if (endDate) {
      newFilters.endDate = endDate
    }

    if (status) {
      newFilters.status = status
    }

    if (phoneNumber) {
      newFilters.phoneNumber = phoneNumber
    }

    setFilters(newFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setStatus('')
    setPhoneNumber('')
    setFilters({})
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  /**
   * Handle page change
   */
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  /**
   * Fetch calls when pagination or filters change
   */
  useEffect(() => {
    // Only fetch if filters are applied or page changed from initial
    if (pagination.page !== 1 || Object.keys(filters).length > 0) {
      fetchCalls()
    }
  }, [pagination.page, filters])

  // Calculate pagination info
  const totalPages = Math.ceil(pagination.total / pagination.limit)
  const startIndex = (pagination.page - 1) * pagination.limit + 1
  const endIndex = Math.min(startIndex + pagination.limit - 1, pagination.total)

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="failed">Failed</option>
              <option value="in_progress">In Progress</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Phone Number Search */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              placeholder="Search by phone"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Applying...' : 'Apply Filters'}
          </button>
          <button
            onClick={handleClearFilters}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Calls Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 text-gray-400 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading calls...
                    </div>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="h-12 w-12 text-gray-400 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No calls found matching your filters
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                calls.map((call) => <CallRow key={call.id} call={call} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
            {/* Pagination Info */}
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{startIndex}</span> to{' '}
              <span className="font-medium">{endIndex}</span> of{' '}
              <span className="font-medium">{pagination.total}</span> calls
            </div>

            {/* Pagination Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || isLoading}
                className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages || isLoading}
                className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Call Row Props
 */
interface CallRowProps {
  call: Call
}

/**
 * Call Row Component
 *
 * Displays a single call in the table.
 *
 * @param props - Call row props
 * @returns Call row JSX
 */
function CallRow({ call }: CallRowProps) {
  // Format call date
  const callDate = new Date(call.call_date)
  const formattedDate = callDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = callDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Status badge color
  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    missed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const statusBadgeClass = statusColors[call.status] || statusColors.cancelled

  // Format duration
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {/* Date & Time */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white">{formattedDate}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{formattedTime}</div>
      </td>

      {/* Phone Number */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 dark:text-white font-medium">
          {call.phone_number}
        </div>
      </td>

      {/* Duration */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {formatDuration(call.duration)}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClass}`}
        >
          {call.status.replace('_', ' ')}
        </span>
      </td>

      {/* Outcome */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {call.outcome ? call.outcome.replace('_', ' ') : '-'}
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Link
          href={`/dashboard/calls/${call.id}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          View Details
        </Link>
      </td>
    </tr>
  )
}
