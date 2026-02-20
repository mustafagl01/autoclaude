/**
 * User Profile API Route
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * API endpoint for updating user profile information.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see /lib/db.ts - Database query functions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { getDb, updateUser, type DbResult } from '@/lib/db';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Update profile request body
 */
interface UpdateProfileRequest {
  name: string;
}

/**
 * Update profile response
 */
interface UpdateProfileResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// API Route Handler - PATCH
// ============================================================================

/**
 * PATCH /api/user/profile
 *
 * Updates user profile information (currently only name).
 * Requires authenticated session.
 *
 * @param request - Next.js request object
 * @returns JSON response with success status or error
 *
 * @example
 * // Request:
 * PATCH /api/user/profile
 * { "name": "John Doe" }
 *
 * // Response (success):
 * { "success": true, "message": "Profile updated successfully" }
 *
 * // Response (error):
 * { "success": false, "error": "Name is required" }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Get current session (authentication check)
    const session = await auth();

    // Return 401 if no valid session
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as UpdateProfileResponse,
        { status: 401 }
      );
    }

    // Get database instance
    const db = getDb();

    // Parse request body
    const body: UpdateProfileRequest = await request.json();

    // Validate name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required and must be a non-empty string' } as UpdateProfileResponse,
        { status: 400 }
      );
    }

    // Trim whitespace from name
    const name = body.name.trim();

    // Limit name length
    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Name must be 100 characters or less' } as UpdateProfileResponse,
        { status: 400 }
      );
    }

    // Update user in database
    const updateResult: DbResult<{ id: string; name: string }> = await updateUser(db, session.user.id, {
      name,
    });

    // Check if update was successful
    if (!updateResult.success || !updateResult.data) {
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to update profile' } as UpdateProfileResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
      } as UpdateProfileResponse,
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      } as UpdateProfileResponse,
      { status: 500 }
    );
  }
}

