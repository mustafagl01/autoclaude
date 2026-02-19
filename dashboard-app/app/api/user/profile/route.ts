import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { updateUser } from '@/lib/db';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Name is required and must be a non-empty string' }, { status: 400 });
    }

    const name = body.name.trim();
    if (name.length > 100) {
      return NextResponse.json({ success: false, error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    const updateResult = await updateUser(session.user.id, { name });

    if (!updateResult.success) {
      return NextResponse.json({ success: false, error: updateResult.error || 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }, { status: 500 });
  }
}
