import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { listCallsViaApi } from '@/lib/retell';
import { getUserById, cacheCall } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/retell/sync
 * Fetches calls from Retell API and caches them in Postgres for the current user.
 * Uses the user's Retell API key stored in Profile (per-user). If none set, returns 400.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
  const apiKey = user?.retell_api_key?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Add your Retell API key in Profile (Dashboard → Profile) to sync calls.',
      },
      { status: 400 }
    );
  }

  const result = await listCallsViaApi(
    { limit: 200, sort_order: 'descending' },
    apiKey
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error || 'Retell API request failed.' },
      { status: 502 }
    );
  }

  const calls = result.data ?? [];
  let synced = 0;
  let failed = 0;

  for (const call of calls) {
    const cacheResult = await cacheCall({
      id: call.call_id,
      user_id: session.user.id,
      phone_number: call.phone_number,
      duration: call.duration ?? null,
      status: call.status,
      outcome: call.outcome ?? null,
      transcript: call.transcript ?? null,
      recording_url: call.recording_url ?? null,
      call_date: call.start_time || new Date().toISOString(),
    });
    if (cacheResult.success) synced++;
    else failed++;
  }

  return NextResponse.json({
    success: true,
    data: { synced, failed, total: calls.length },
  });
}
