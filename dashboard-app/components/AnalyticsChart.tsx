'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
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
 * Chart data point for call volume and cost over time
 */
interface CallVolumeDataPoint {
  date: string
  calls: number
  costCents: number
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
 * Chart data point for status distribution
 */
interface StatusDataPoint {
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
 * Process call data to generate call volume and cost over time chart data
 * Groups calls by date, counts them and sums cost per day
 */
function useCallVolumeData(calls: Call[]): CallVolumeDataPoint[] {
  return useMemo(() => {
    const byDate: Record<string, { calls: number; costCents: number }> = {}

    calls.forEach((call) => {
      const date = new Date(call.call_date).toISOString().split('T')[0]
      if (!byDate[date]) byDate[date] = { calls: 0, costCents: 0 }
      byDate[date].calls += 1
      byDate[date].costCents += call.call_cost_cents ?? 0
    })

    const sortedData = Object.entries(byDate)
      .map(([date, { calls: count, costCents }]) => ({ date, calls: count, costCents }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return sortedData.map((point) => ({
      date: formatShortDate(point.date),
      calls: point.calls,
      costCents: point.costCents,
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

/**
 * Process call data by status for donut (completed, missed, failed, other)
 */
function useStatusDistributionData(calls: Call[]): StatusDataPoint[] {
  return useMemo(() => {
    const colorMap: Record<string, string> = {
      completed: '#10b981',
      missed: '#f59e0b',
      failed: '#ef4444',
    }
    const statusCounts: Record<string, number> = {}
    calls.forEach((call) => {
      const status = call.status || 'unknown'
      const key = colorMap[status] ? status : 'other'
      statusCounts[key] = (statusCounts[key] || 0) + 1
    })
    if (!statusCounts.other) statusCounts.other = 0
    const otherColor = '#6b7280'
    return Object.entries(statusCounts)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: colorMap[name] || otherColor,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [calls])
}

/**
 * Hourly call counts for heatmap (0–23)
 */
function useHourlyData(calls: Call[]): { hour: number; count: number }[] {
  return useMemo(() => {
    const counts: number[] = Array(24).fill(0)
    calls.forEach((call) => {
      const hour = new Date(call.call_date).getHours()
      counts[hour] += 1
    })
    return counts.map((count, hour) => ({ hour, count }))
  }, [calls])
}

// ============================================================================
// Custom Tooltip Components
// ============================================================================

/**
 * Custom tooltip for call volume + cost chart
 */
function CallVolumeTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const p = payload[0].payload
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.date}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Calls: <span className="font-semibold text-blue-600 dark:text-blue-400">{p.calls}</span>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cost: <span className="font-semibold text-green-600 dark:text-green-400">${(p.costCents / 100).toFixed(2)}</span>
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
// Heatmap Subcomponent
// ============================================================================

function getHourBoxClass(count: number): string {
  if (count === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
  if (count === 1) return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-200'
  if (count <= 3) return 'bg-blue-300 dark:bg-blue-700 text-blue-900 dark:text-blue-100'
  if (count <= 6) return 'bg-blue-500 dark:bg-blue-500 text-white'
  return 'bg-blue-700 dark:bg-blue-300 text-white'
}

function HeatmapGrid({ hourlyData }: { hourlyData: { hour: number; count: number }[] }) {
  const busiest = hourlyData.reduce((best, cur) => (cur.count > best.count ? cur : best), { hour: 0, count: 0 })
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {hourlyData.map(({ hour, count }) => (
          <div
            key={hour}
            title={`${hour}:00 — ${count} call${count !== 1 ? 's' : ''}`}
            className={`w-10 h-10 rounded flex items-center justify-center text-xs font-medium ${getHourBoxClass(count)}`}
          >
            {hour}
          </div>
        ))}
      </div>
      {busiest.count > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Busiest hour: <span className="font-semibold text-gray-900 dark:text-white">{busiest.hour}:00</span> ({busiest.count} call{busiest.count !== 1 ? 's' : ''})
        </p>
      )}
    </div>
  )
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
  const statusData = useStatusDistributionData(calls)
  const hourlyData = useHourlyData(calls)

  const hasCallVolumeData = callVolumeData.length > 0
  const hasOutcomeData = outcomeData.length > 0
  const hasStatusData = statusData.length > 0

  return (
    <div className="space-y-6">
      {/* Call Volume Over Time - Line Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Call Volume Over Time
        </h3>

        {hasCallVolumeData ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={callVolumeData} margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
              <XAxis
                dataKey="date"
                className="text-sm text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis yAxisId="left" className="text-sm text-gray-600 dark:text-gray-400" tick={{ fill: 'currentColor' }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `$${(v / 100).toFixed(2)}`}
                className="text-sm text-gray-600 dark:text-gray-400"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CallVolumeTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
              <Bar dataKey="calls" yAxisId="left" fill="#3b82f6" opacity={0.8} name="Calls" />
              <Line
                type="monotone"
                dataKey="costCents"
                yAxisId="right"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Cost ($)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
            <p>No call volume data available</p>
          </div>
        )}
      </div>

      {/* Busiest Hours - Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Busiest Hours
        </h3>
        <HeatmapGrid hourlyData={hourlyData} />
      </div>

      {/* Call Breakdown - Two donuts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Call Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Status */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Status</h4>
            {hasStatusData ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<OutcomeTooltip />} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">No data</div>
            )}
          </div>
          {/* By Outcome */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">By Outcome</h4>
            {hasOutcomeData ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    dataKey="value"
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell key={`outcome-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<OutcomeTooltip />} />
                  <Legend iconType="circle" verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">No outcome data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
