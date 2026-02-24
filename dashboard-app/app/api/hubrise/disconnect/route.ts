/**
 * HubRise OAuth - Disconnect (Vercel Postgres)
 * Deactivates the HubRise connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deactivate all connections for this user
    await sql`
      UPDATE hubrise_connections
      SET is_active = false,
          updated_at = NOW()
      WHERE user_id = ${session.user.id}
    `;

    return NextResponse.json({
      success: true,
      message: 'HubRise connection deactivated',
    });
  } catch (error) {
    console.error('HubRise disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect HubRise' },
      { status: 500 }
    );
  }
}
