import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getUserById, updateUser } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.currentPassword || typeof body.currentPassword !== 'string' || body.currentPassword.length === 0) {
      return NextResponse.json({ success: false, error: 'Current password is required' }, { status: 400 });
    }

    if (!body.newPassword || typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'New password must be at least 8 characters long' }, { status: 400 });
    }

    if (body.newPassword.length > 128) {
      return NextResponse.json({ success: false, error: 'New password must be 128 characters or less' }, { status: 400 });
    }

    if (body.currentPassword === body.newPassword) {
      return NextResponse.json({ success: false, error: 'New password must be different from current password' }, { status: 400 });
    }

    const user = await getUserById(session.user.id);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.password_hash) {
      return NextResponse.json({ success: false, error: 'Password changes are not available for OAuth-only accounts.' }, { status: 400 });
    }

    const verifyResult = await verifyPassword(body.currentPassword, user.password_hash);

    if (!verifyResult.success || !verifyResult.valid) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashResult = await hashPassword(body.newPassword);

    if (!hashResult.success || !hashResult.hash) {
      return NextResponse.json({ success: false, error: hashResult.error || 'Failed to hash new password' }, { status: 500 });
    }

    const updateResult = await updateUser(user.id, { password_hash: hashResult.hash });

    if (!updateResult.success) {
      return NextResponse.json({ success: false, error: updateResult.error || 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password changed successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }, { status: 500 });
  }
}
