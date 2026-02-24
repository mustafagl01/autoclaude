/**
 * HubRise OAuth - Connection Status (Vercel Postgres)
 * Returns whether user has an active HubRise connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    // Get active connection from database
    const result = await sql`
      SELECT id, location_id, location_name, created_at, updated_at
      FROM hubrise_connections
      WHERE user_id = ${session.user.id} AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({
        connected: false,
        location: null,
      });
    }

    const connection = result.rows[0];
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
