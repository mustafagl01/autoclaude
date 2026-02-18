'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Call } from '@/lib/db'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Chart data point for call volume over time
 */
interface CallVolumeDataPoint {
  date: string
  calls: number
}

/**
 * Chart data point for outcome distribution
 */
interface OutcomeDataPoint {
  name: string
  value: number
  color: string
}

/**
 * Analytics Chart Props
 *
 * @param calls - Array of call records to visualize
 */
export interface AnalyticsChartProps {
  calls: Call[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format date to short format (DD MMM)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Format date to long format (DD MMM YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatLongDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ============================================================================
// Data Processing Hooks
// ============================================================================

/**
 * Process call data to generate call volume over time chart data
 * Groups calls by date and counts them
 */
function useCallVolumeData(calls: Call[]): CallVolumeDataPoint[] {
  return useMemo(() => {
    // Group calls by date
    const callsByDate: Record<string, number> = {}

    calls.forEach((call) => {
      const date = new Date(call.call_date).toISOString().split('T')[0]
      callsByDate[date] = (callsByDate[date] || 0) + 1
    })

    // Convert to array and sort by date
    const sortedData = Object.entries(callsByDate)
      .map(([date, count]) => ({ date, calls: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Format dates for display
    return sortedData.map((point) => ({
      date: formatShortDate(point.date),
      calls: point.calls,
    }))
  }, [calls])
}

/**
 * Process call data to generate outcome distribution chart data
 * Groups calls by outcome type and counts them
 */
function useOutcomeDistributionData(calls: Call[]): OutcomeDataPoint[] {
  return useMemo(() => {
    // Define outcome colors
    const colorMap: Record<string, string> = {
      order_placed: '#10b981', // green
      inquiry: '#3b82f6', // blue
      complaint: '#ef4444', // red
      voicemail: '#f59e0b', // amber
      wrong_number: '#6b7280', // gray
      other: '#8b5cf6', // purple
    }

    // Group calls by outcome
    const outcomeCounts: Record<string, number> = {}
    const otherOutcomes: Record<string, number> = {}

    calls.forEach((call) => {
      const outcome = call.outcome || 'unknown'

      if (colorMap[outcome]) {
        outcomeCounts[outcome] = (outcomeCounts[outcome] || 0) + 1
      } else {
        otherOutcomes[outcome] = (otherOutcomes[outcome] || 0) + 1
      }
    })

    // Combine "other" outcomes if any exist
    if (Object.keys(otherOutcomes).length > 0) {
      outcomeCounts.other = Object.values(otherOutcomes).reduce((sum, count) => sum + count, 0)
    }

    // Convert to array
    return Object.entries(outcomeCounts)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: colorMap[name] || colorMap.other,
      }))
      .sort((a, b) => b.value - a.value)
  }, [calls])
}

// ============================================================================
// Custom Tooltip Components
// ============================================================================

/**
 * Custom tooltip for call volume chart
 */
function CallVolumeTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {payload[0].payload.date}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Calls: <span className="font-semibold text-blue-600 dark:text-blue-400">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

/**
 * Custom tooltip for outcome distribution chart
 */
function OutcomeTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {data.name}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Count: <span className="font-semibold" style={{ color: data.color }}>{data.value}</span>
        </p>
      </div>
    )
  }
  return null
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Analytics Chart Component
 *
 * Displays interactive charts for visualizing phone call analytics.
 * Includes a line chart for call volume over time and a pie chart for outcome distribution.
 *
 * Features:
 * - Line chart showing call volume trends over time
 * - Pie chart showing distribution of call outcomes
 * - Interactive tooltips on hover
 * - Responsive design
 * - Dark mode support
 * - Color-coded outcomes
 *
 * @example
 * ```tsx
 * <AnalyticsChart calls={calls} />
 * ```
 */
export default function AnalyticsChart({ calls }: AnalyticsChartProps) {
  const callVolumeData = useCallVolumeData(calls)
  const outcomeData = useOutcomeDistributionData(calls)

  const hasCallVolumeData = callVolumeData.length > 0
  const hasOutcomeData = outcomeData.length > 0

  return (
    <div className="space-y-6">
      {/* Call Volume Over Time - Line Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Call Volume Over Time
        </h3>

        {hasCallVolumeData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={callVolumeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis
                dataKey="date"
                className="text-sm text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-sm text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CallVolumeTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
              />
              <Line
                type="monotone"
                dataKey="calls"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Number of Calls"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            <p>No call volume data available</p>
          </div>
        )}
      </div>

      {/* Outcome Distribution - Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Call Outcome Distribution
        </h3>

        {hasOutcomeData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <Pie
                data={outcomeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {outcomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<OutcomeTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                verticalAlign="bottom"
                height={36}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            <p>No outcome data available</p>
          </div>
        )}
      </div>
    </div>
  )
}
