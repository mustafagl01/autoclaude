/**
 * User Password API Route
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * API endpoint for changing user password.
 * Protected route requiring authentication.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 * @see /lib/db.ts - Database query functions
 * @see /lib/auth.ts - Password hashing and verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import { getDb, getUserById, updateUser, type DbResult, type User } from '@/lib/db';
import { hashPassword, verifyPassword, type HashResult, type VerifyResult } from '@/lib/auth';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Change password request body
 */
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Change password response
 */
interface ChangePasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// API Route Handler - POST
// ============================================================================

/**
 * POST /api/user/password
 *
 * Changes user password after verifying current password.
 * Requires authenticated session.
 *
 * @param request - Next.js request object
 * @returns JSON response with success status or error
 *
 * @example
 * // Request:
 * POST /api/user/password
 * {
 *   "currentPassword": "oldPassword123",
 *   "newPassword": "newPassword456"
 * }
 *
 * // Response (success):
 * { "success": true, "message": "Password changed successfully" }
 *
 * // Response (error - wrong current password):
 * { "success": false, "error": "Current password is incorrect" }
 *
 * // Response (error - OAuth-only user):
 * { "success": false, "error": "Password changes are not available for OAuth-only accounts" }
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session (authentication check)
    const session = await auth();

    // Return 401 if no valid session
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ChangePasswordResponse,
        { status: 401 }
      );
    }

    // Get database instance
    const db = getDb();

    // Parse request body
    const body: ChangePasswordRequest = await request.json();

    // Validate current password
    if (!body.currentPassword || typeof body.currentPassword !== 'string' || body.currentPassword.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Current password is required' } as ChangePasswordResponse,
        { status: 400 }
      );
    }

    // Validate new password
    if (!body.newPassword || typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters long' } as ChangePasswordResponse,
        { status: 400 }
      );
    }

    // Limit new password length
    if (body.newPassword.length > 128) {
      return NextResponse.json(
        { success: false, error: 'New password must be 128 characters or less' } as ChangePasswordResponse,
        { status: 400 }
      );
    }

    // Check if current and new passwords are the same
    if (body.currentPassword === body.newPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from current password' } as ChangePasswordResponse,
        { status: 400 }
      );
    }

    // Fetch user from database
    const userResult: DbResult<User> = await getUserById(db, session.user.id);

    // Check if user exists
    if (!userResult.success || !userResult.data) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ChangePasswordResponse,
        { status: 404 }
      );
    }

    const user = userResult.data;

    // Check if user has password hash (OAuth-only users may not)
    if (!user.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password changes are not available for OAuth-only accounts. Please link an email/password account first.',
        } as ChangePasswordResponse,
        { status: 400 }
      );
    }

    // Verify current password
    const verifyResult: VerifyResult = await verifyPassword(body.currentPassword, user.password_hash);

    // Check if current password is correct
    if (!verifyResult.success || !verifyResult.valid) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' } as ChangePasswordResponse,
        { status: 400 }
      );
    }

    // Hash new password
    const hashResult: HashResult = await hashPassword(body.newPassword);

    // Check if hashing was successful
    if (!hashResult.success || !hashResult.hash) {
      return NextResponse.json(
        { success: false, error: hashResult.error || 'Failed to hash new password' } as ChangePasswordResponse,
        { status: 500 }
      );
    }

    // Update password in database
    const updateResult: DbResult<{ id: string; password_hash: string }> = await updateUser(db, user.id, {
      password_hash: hashResult.hash,
    });

    // Check if update was successful
    if (!updateResult.success) {
      return NextResponse.json(
        { success: false, error: updateResult.error || 'Failed to update password' } as ChangePasswordResponse,
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Password changed successfully',
      } as ChangePasswordResponse,
      { status: 200 }
    );
  } catch (error) {
    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      } as ChangePasswordResponse,
      { status: 500 }
    );
  }
}

