import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getCallsByDateRange, type Call } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Missing required parameters: start_date and end_date' }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD format.' }, { status: 400 });
    }

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      return NextResponse.json({ success: false, error: 'Start date must be before or equal to end date.' }, { status: 400 });
    }

    const callsResult = await getCallsByDateRange(session.user.id, startDate, endDate);

    if (!callsResult.success || !callsResult.data) {
      throw new Error(callsResult.error || 'Failed to fetch analytics data');
    }

    const calls: Call[] = callsResult.data;
    return NextResponse.json({ success: true, data: { calls, total: calls.length } }, { status: 200 });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
