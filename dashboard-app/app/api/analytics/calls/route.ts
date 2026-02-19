/**
 * Analytics Calls API Route
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * GET /api/analytics/calls
 *
 * Fetches phone call data for analytics visualizations.
 * Requires authenticated session via NextAuth.js.
 *
 * Query Parameters:
 * - start_date: Start date in YYYY-MM-DD format (required)
 * - end_date: End date in YYYY-MM-DD format (required)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     calls: Call[],
 *     total: number
 *   }
 * }
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see /lib/db.ts - Database query functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { getDb, getCallsByDateRange, type Call } from '@/lib/db';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Analytics API response data
 */
interface AnalyticsResponseData {
  calls: Call[];
  total: number;
}

// ============================================================================
// GET Handler - Fetch Analytics Call Data
// ============================================================================

/**
 * GET /api/analytics/calls
 *
 * Fetches phone call data for analytics charts and visualizations.
 * Supports date range filtering.
 *
 * Authentication: Required (valid NextAuth session)
 *
 * Query Parameters:
 * @param start_date - Start date in YYYY-MM-DD format (required)
 * @param end_date - End date in YYYY-MM-DD format (required)
 *
 * @returns JSON response with calls array or error message
 *
 * @example
 * // Request
 * GET /api/analytics/calls?start_date=2024-01-01&end_date=2024-01-31
 *
 * // Success Response (200)
 * {
 *   "success": true,
 *   "data": {
 *     "calls": [...],
 *     "total": 150
 *   }
 * }
 *
 * // Error Response (401)
 * {
 *   "success": false,
 *   "error": "Unauthorized"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Get current session (authentication check)
    const session = await auth();

    // Return 401 if not authenticated
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: start_date and end_date',
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }

    // Validate date range
    const startDateTime = new Date(startDate).getTime();
    const endDateTime = new Date(endDate).getTime();

    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date values.',
        },
        { status: 400 }
      );
    }

    if (startDateTime > endDateTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date must be before or equal to end date.',
        },
        { status: 400 }
      );
    }

    // Get D1 database instance
    const db = getDb();

    // Fetch calls within date range for the authenticated user
    const callsResult = await getCallsByDateRange(
      db,
      session.user.id,
      startDate,
      endDate
    );

    // Check if query was successful
    if (!callsResult.success || !callsResult.data) {
      throw new Error(callsResult.error || 'Failed to fetch analytics data');
    }

    const calls: Call[] = callsResult.data;

    // Return success response with calls data
    const responseData: AnalyticsResponseData = {
      calls,
      total: calls.length,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      { status: 200 }
    );

  } catch (error) {
    // Log error for debugging (avoid exposing sensitive details in response)
    console.error('Analytics API error:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Runtime Configuration
// ============================================================================

/**
 * Edge runtime configuration for Cloudflare Workers compatibility
 */
export const runtime = 'edge';

