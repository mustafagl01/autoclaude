/**
 * API Route: Fetch Calls with Filters
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * GET /api/calls
 *
 * Fetches phone calls from D1 database with optional filtering and pagination.
 * Requires authentication via NextAuth.js session.
 *
 * Query Parameters:
 * - userId: User ID to fetch calls for (required)
 * - limit: Number of calls per page (default: 25, max: 100)
 * - offset: Number of calls to skip (for pagination, default: 0)
 * - startDate: Filter calls from this date (ISO 8601 format)
 * - endDate: Filter calls until this date (ISO 8601 format)
 * - status: Filter by call status (completed, missed, failed, in_progress, cancelled)
 * - phoneNumber: Search by phone number (partial match)
 *
 * @see /lib/db.ts - Database query functions
 * @see /components/CallList.tsx - Client component that uses this API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/api/auth/[...nextauth]/route';
import { getDb, getCallsByUserId, getCallsByDateRange, getCallsByStatus, getCallsByPhoneNumber, type Call } from '@/lib/db';

// ============================================================================
// Route Configuration
// ============================================================================

export const runtime = 'edge';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Query parameters for the /api/calls endpoint
 */
interface CallQueryParams {
  userId: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  phoneNumber?: string;
}

// ============================================================================
// GET Handler
// ============================================================================

/**
 * GET /api/calls
 *
 * Fetches phone calls with optional filtering and pagination.
 * Requires valid authentication session.
 *
 * @param request - Next.js request object
 * @returns JSON response with calls data or error
 *
 * @example
 * // Fetch all calls for a user
 * GET /api/calls?userId=user123
 *
 * @example
 * // Fetch with pagination
 * GET /api/calls?userId=user123&limit=25&offset=0
 *
 * @example
 * // Fetch with date range filter
 * GET /api/calls?userId=user123&startDate=2024-01-01&endDate=2024-12-31
 *
 * @example
 * // Fetch with status filter
 * GET /api/calls?userId=user123&status=completed
 *
 * @example
 * // Search by phone number
 * GET /api/calls?userId=user123&phoneNumber=+44
 *
 * Response format (success):
 * {
 *   "success": true,
 *   "data": {
 *     "calls": [...],
 *     "total": 100
 *   }
 * }
 *
 * Response format (error):
 * {
 *   "success": false,
 *   "error": "Error message"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authConfig);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const phoneNumber = searchParams.get('phoneNumber');

    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    // Validate user ID matches session (security check)
    if (userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: User ID mismatch' },
        { status: 403 }
      );
    }

    // Parse and validate pagination parameters
    const limit = limitParam ? parseInt(limitParam, 10) : 25;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { success: false, error: 'offset must be >= 0' },
        { status: 400 }
      );
    }

    // Get D1 database instance
    const db = getDb();

    // Fetch calls based on filters
    let callsResult: { success: boolean; data?: Call[]; error?: string };

    if (startDate && endDate) {
      // Date range filter
      callsResult = await getCallsByDateRange(
        db,
        userId,
        new Date(startDate),
        new Date(endDate),
        limit,
        offset
      );
    } else if (status) {
      // Status filter
      callsResult = await getCallsByStatus(
        db,
        userId,
        status,
        limit,
        offset
      );
    } else if (phoneNumber) {
      // Phone number search
      callsResult = await getCallsByPhoneNumber(
        db,
        userId,
        phoneNumber,
        limit,
        offset
      );
    } else {
      // No filters, get all calls for user
      callsResult = await getCallsByUserId(
        db,
        userId,
        limit,
        offset
      );
    }

    // Handle database query errors
    if (!callsResult.success || !callsResult.data) {
      throw new Error(callsResult.error || 'Failed to fetch calls');
    }

    // Get total count (for pagination)
    // Note: In a real application, you might want to cache this or optimize the query
    const totalResult = await getCallsByUserId(db, userId, 1000, 0);
    const total = totalResult.success && totalResult.data ? totalResult.data.length : callsResult.data.length;

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        calls: callsResult.data,
        total,
      },
    });

  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
