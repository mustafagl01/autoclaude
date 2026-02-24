/**
 * HubRise OAuth - Disconnect
 * Deactivates the HubRise connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Check session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deactivate all connections for this user
    const db = getDb();
    db.prepare(`
      UPDATE hubrise_connections
      SET is_active = 0,
          updated_at = datetime('now')
      WHERE user_id = ?
    `).run(session.user.id);

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
