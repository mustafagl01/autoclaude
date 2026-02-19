/**
 * Retell Calls API Route
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides authenticated access to phone call data from Retell AI.
 * Fetches calls with optional filtering by date range, status, and phone number.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see /lib/retell.ts - Retell SDK client wrapper
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { getCalls, type CallQueryParams, type RetellCall } from '@/lib/retell';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Query parameters for the /api/retell/calls endpoint
 *
 * All parameters are optional
 */
interface CallsQueryParams {
  /** Maximum number of calls to return (default: 100) */
  limit?: string;
  /** Number of calls to skip (for pagination) */
  offset?: string;
  /** Filter calls starting from this ISO date (e.g., 2024-01-01T00:00:00Z) */
  start_date?: string;
  /** Filter calls ending before this ISO date (e.g., 2024-01-31T23:59:59Z) */
  end_date?: string;
  /** Filter by call status (completed, missed, failed, in_progress, cancelled) */
  status?: string;
  /** Filter by customer phone number */
  phone_number?: string;
}

// ============================================================================
// GET Handler - Fetch Phone Calls
// ============================================================================

/**
 * GET /api/retell/calls
 *
 * Fetches phone call data from Retell AI with authentication check.
 *
 * Query Parameters:
 * - limit: Maximum number of calls to return (default: 100)
 * - offset: Number of calls to skip for pagination (default: 0)
 * - start_date: ISO date string to filter calls after this date
 * - end_date: ISO date string to filter calls before this date
 * - status: Filter by call status (completed, missed, failed, in_progress, cancelled)
 * - phone_number: Filter by customer phone number
 *
 * Authentication:
 * - Requires valid NextAuth session
 * - Returns 401 Unauthorized if no session
 *
 * Response Format:
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "calls": [
 *       {
 *         "call_id": "call_abc123",
 *         "phone_number": "+441234567890",
 *         "start_time": "2024-01-15T10:30:00Z",
 *         "end_time": "2024-01-15T10:35:00Z",
 *         "duration": 300,
 *         "status": "completed",
 *         "outcome": "order_placed",
 *         "transcript": "Full conversation text...",
 *         "recording_url": "https://...",
 *         "call_analysis": { "sentiment": "positive", "confidence": 0.95 }
 *       }
 *     ],
 *     "total": 150
 *   }
 * }
 * ```
 *
 * Error Response:
 * ```json
 * {
 *   "success": false,
 *   "error": "Error message describing what went wrong"
 * }
 * ```
 *
 * @param request - Next.js Request object with query parameters
 * @returns Next.js Response with call data or error
 *
 * @example
 * // Fetch all calls (default limit 100)
 * const response = await fetch('/api/retell/calls');
 * const data = await response.json();
 *
 * @example
 * // Fetch calls with filters
 * const response = await fetch(
 *   '/api/retell/calls?limit=50&status=completed&start_date=2024-01-01T00:00:00Z'
 * );
 * const data = await response.json();
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // --------------------------------------------------------------------------
  // Authentication Check
  // --------------------------------------------------------------------------

  /**
   * Verify user is authenticated
   *
   * Uses auth() to validate the NextAuth JWT token.
   * If no valid session exists, returns 401 Unauthorized.
   *
   * @see https://next-auth.js.org/configuration/nextjs#getserversession
   */
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized - Please sign in to access call data',
      },
      { status: 401 }
    );
  }

  // --------------------------------------------------------------------------
  // Extract Query Parameters
  // --------------------------------------------------------------------------

  /**
   * Parse and validate query parameters from the request URL
   */
  const searchParams = request.nextUrl.searchParams;
  const queryParams: CallsQueryParams = {
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
    status: searchParams.get('status') || undefined,
    phone_number: searchParams.get('phone_number') || undefined,
  };

  // Build parameters for Retell SDK
  const retellParams: CallQueryParams = {};

  // Parse and validate limit parameter
  if (queryParams.limit) {
    const limit = parseInt(queryParams.limit, 10);
    if (!isNaN(limit) && limit > 0 && limit <= 1000) {
      retellParams.limit = limit;
    }
    // If invalid, use Retell SDK default (100)
  }

  // Parse and validate offset parameter
  if (queryParams.offset) {
    const offset = parseInt(queryParams.offset, 10);
    if (!isNaN(offset) && offset >= 0) {
      retellParams.offset = offset;
    }
  }

  // Add date range filters if provided
  if (queryParams.start_date) {
    retellParams.start_date = queryParams.start_date;
  }

  if (queryParams.end_date) {
    retellParams.end_date = queryParams.end_date;
  }

  // Add status filter if provided
  if (queryParams.status) {
    retellParams.status = queryParams.status as any; // Type assertion for valid CallStatus
  }

  // Add phone number filter if provided
  if (queryParams.phone_number) {
    retellParams.phone_number = queryParams.phone_number;
  }

  // --------------------------------------------------------------------------
  // Fetch Call Data from Retell
  // --------------------------------------------------------------------------

  try {
    /**
     * Fetch calls from Retell AI using the SDK client wrapper
     *
     * The getCalls function handles:
     * - Retell SDK client initialization
     * - API call with error handling
     * - Data transformation to our interface
     */
    const result = await getCalls(retellParams);

    if (!result.success) {
      // Retell API returned an error
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch calls from Retell AI',
        },
        { status: 500 }
      );
    }

    if (!result.data) {
      // No data returned (unexpected case)
      return NextResponse.json(
        {
          success: false,
          error: 'No call data available',
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------------------------
    // Return Successful Response
    // --------------------------------------------------------------------------

    /**
     * Return call data to the client
     *
     * The response includes:
     * - Array of call records
     * - Total count for pagination
     */
    return NextResponse.json({
      success: true,
      data: {
        calls: result.data.calls,
        total: result.data.total,
      },
    });
  } catch (error) {
    // --------------------------------------------------------------------------
    // Error Handling
    // --------------------------------------------------------------------------

    /**
     * Handle unexpected errors during fetch
     *
     * Errors could include:
     * - Network issues
     * - Retell API unavailability
     * - Invalid API credentials
     * - Malformed API response
     */
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Log error for debugging (in production, use proper logging service)
    // Don't expose sensitive details to client

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch call data. Please try again later.',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Runtime Configuration
// ============================================================================

/**
 * Edge runtime configuration
 *
 * This API route runs on Cloudflare Workers edge runtime.
 * Edge functions provide low-latency responses and global distribution.
 *
 * @see https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes
 */
export const runtime = 'edge';

