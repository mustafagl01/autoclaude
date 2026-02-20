import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getUserById, updateUser } from '@/lib/db';

export const runtime = 'nodejs';

/** GET: return profile fields needed for form (no sensitive key value). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const user = await getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
        hasRetellKey: !!user.retell_api_key?.trim(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load profile' }, { status: 500 });
  }
}

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

    const updates: { name: string; retell_api_key?: string | null } = { name };
    if (body.retell_api_key !== undefined) {
      updates.retell_api_key = typeof body.retell_api_key === 'string' ? body.retell_api_key.trim() || null : null;
    }

    const updateResult = await updateUser(session.user.id, updates);

    if (!updateResult.success) {
      return NextResponse.json({ success: false, error: updateResult.error || 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' }, { status: 500 });
  }
}
