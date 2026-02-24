/**
 * HubRise OAuth - Connection Status
 * Returns whether user has an active HubRise connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    // Get active connection from database
    const db = getDb();
    const connection = db.prepare(`
      SELECT id, location_id, location_name, created_at, updated_at
      FROM hubrise_connections
      WHERE user_id = ? AND is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `).get(session.user.id) as {
      id: number;
      location_id: string;
      location_name: string;
      created_at: string;
      updated_at: string;
    } | undefined;

    if (!connection) {
      return NextResponse.json({
        connected: false,
        location: null,
      });
    }

    return NextResponse.json({
      connected: true,
      location: {
        id: connection.location_id,
        name: connection.location_name,
        connectedAt: connection.created_at,
        updatedAt: connection.updated_at,
      },
    });
  } catch (error) {
    console.error('HubRise status error:', error);
    return NextResponse.json(
      { error: 'Failed to get HubRise status' },
      { status: 500 }
    );
  }
}
