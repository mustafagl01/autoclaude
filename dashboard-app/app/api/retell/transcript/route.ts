/**
 * Retell Call Transcript API Route
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides authenticated access to individual phone call transcripts from Retell AI.
 * Fetches full transcript text for a specific call by call ID.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see /lib/retell.ts - Retell SDK client wrapper
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { getTranscript } from '@/lib/retell';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Query parameters for the /api/retell/transcript endpoint
 */
interface TranscriptQueryParams {
  /** Unique call identifier from Retell AI */
  callId: string;
}

// ============================================================================
// GET Handler - Fetch Call Transcript
// ============================================================================

/**
 * GET /api/retell/transcript?callId={callId}
 *
 * Fetches the full transcript text for a specific phone call from Retell AI.
 *
 * Query Parameters:
 * - callId: (required) Unique call identifier from Retell AI
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
 *     "callId": "call_abc123",
 *     "transcript": "Agent: Hello, thank you for calling...\\nCustomer: Hi, I'd like to order..."
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
 * @returns Next.js Response with transcript data or error
 *
 * @example
 * // Fetch transcript for a specific call
 * const response = await fetch('/api/retell/transcript?callId=call_abc123');
 * const data = await response.json();
 * if (data.success) {
 *   console.log(data.data.transcript);
 * }
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
        error: 'Unauthorized - Please sign in to access call transcripts',
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
  const callId = searchParams.get('callId');

  // Validate callId parameter
  if (!callId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameter: callId',
      },
      { status: 400 }
    );
  }

  // Validate callId is not empty
  if (callId.trim() === '') {
    return NextResponse.json(
      {
        success: false,
        error: 'callId parameter cannot be empty',
      },
      { status: 400 }
    );
  }

  // --------------------------------------------------------------------------
  // Fetch Transcript from Retell
  // --------------------------------------------------------------------------

  try {
    /**
     * Fetch transcript from Retell AI using the SDK client wrapper
     *
     * The getTranscript function handles:
     * - Retell SDK client initialization
     * - API call with error handling
     * - Data transformation
     */
    const result = await getTranscript(callId);

    if (!result.success) {
      // Retell API returned an error
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fetch transcript from Retell AI',
        },
        { status: 500 }
      );
    }

    if (result.data === undefined) {
      // No data returned (unexpected case)
      return NextResponse.json(
        {
          success: false,
          error: 'No transcript data available',
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------------------------------
    // Return Successful Response
    // --------------------------------------------------------------------------

    /**
     * Return transcript data to the client
     *
     * The response includes:
     * - Call ID for reference
     * - Full transcript text
     */
    return NextResponse.json({
      success: true,
      data: {
        callId,
        transcript: result.data,
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
        error: 'Failed to fetch transcript. Please try again later.',
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

