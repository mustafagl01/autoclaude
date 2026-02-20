import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getCallsByUserId, getCallsByDateRange, getCallsByStatus, getCallsByPhoneNumber, type Call } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const phoneNumber = searchParams.get('phoneNumber');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId parameter is required' }, { status: 400 });
    }

    if (userId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized: User ID mismatch' }, { status: 403 });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 25;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ success: false, error: 'limit must be between 1 and 100' }, { status: 400 });
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({ success: false, error: 'offset must be >= 0' }, { status: 400 });
    }

    let callsResult: { success: boolean; data?: Call[]; error?: string };

    if (startDate && endDate) {
      callsResult = await getCallsByDateRange(userId, startDate, endDate, limit, offset);
    } else if (status) {
      callsResult = await getCallsByStatus(userId, status, limit, offset);
    } else if (phoneNumber) {
      callsResult = await getCallsByPhoneNumber(userId, phoneNumber, limit, offset);
    } else {
      callsResult = await getCallsByUserId(userId, limit, offset);
    }

    if (!callsResult.success || !callsResult.data) {
      throw new Error(callsResult.error || 'Failed to fetch calls');
    }

    const totalResult = await getCallsByUserId(userId, 1000, 0);
    const total = totalResult.success && totalResult.data ? totalResult.data.length : callsResult.data.length;

    return NextResponse.json({ success: true, data: { calls: callsResult.data, total } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
