import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getTranscript } from '@/lib/retell';

export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized - Please sign in to access call transcripts' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const callId = searchParams.get('callId');

  if (!callId || callId.trim() === '') {
    return NextResponse.json({ success: false, error: 'Missing required parameter: callId' }, { status: 400 });
  }

  try {
    const result = await getTranscript(callId);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Failed to fetch transcript from Retell AI' }, { status: 500 });
    }

    if (result.data === undefined) {
      return NextResponse.json({ success: false, error: 'No transcript data available' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { callId, transcript: result.data } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch transcript. Please try again later.' }, { status: 500 });
  }
}
