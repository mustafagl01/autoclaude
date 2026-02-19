import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getCalls, type CallQueryParams } from '@/lib/retell';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized - Please sign in to access call data' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const retellParams: CallQueryParams = {};

  const limit = searchParams.get('limit');
  if (limit) {
    const parsed = parseInt(limit, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) retellParams.limit = parsed;
  }

  const offset = searchParams.get('offset');
  if (offset) {
    const parsed = parseInt(offset, 10);
    if (!isNaN(parsed) && parsed >= 0) retellParams.offset = parsed;
  }

  const start_date = searchParams.get('start_date');
  if (start_date) retellParams.start_date = start_date;

  const end_date = searchParams.get('end_date');
  if (end_date) retellParams.end_date = end_date;

  const status = searchParams.get('status');
  if (status) retellParams.status = status as any;

  const phone_number = searchParams.get('phone_number');
  if (phone_number) retellParams.phone_number = phone_number;

  try {
    const result = await getCalls(retellParams);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to fetch calls from Retell AI' }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ success: false, error: 'No call data available' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { calls: result.data.calls, total: result.data.total } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch call data. Please try again later.' }, { status: 500 });
  }
}
