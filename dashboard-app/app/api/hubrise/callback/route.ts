/**
 * HubRise OAuth - Callback Handler
 * Handles OAuth callback and stores connection in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getHubRiseClient } from '@/lib/hubrise-client';

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/login?error=hubrise_auth_failed', req.url)
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('HubRise OAuth error:', error);
      return NextResponse.redirect(
        new URL('/settings/integrations?error=hubrise_oauth_error', req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', req.url)
      );
    }

    // Exchange code for token
    const hubRiseClient = getHubRiseClient();
    const tokenResponse = await hubRiseClient.exchangeCodeForToken(code);

    // Get location information
    const location = await hubRiseClient.getLocation(
      tokenResponse.location_id,
      tokenResponse.access_token
    );

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString();

    // Store in database
    const db = getDb();

    // Check if connection already exists
    const existing = db.prepare(
      'SELECT id FROM hubrise_connections WHERE user_id = ? AND location_id = ?'
    ).get(session.user.id, tokenResponse.location_id);

    if (existing) {
      // Update existing connection
      db.prepare(`
        UPDATE hubrise_connections
        SET access_token = ?,
            refresh_token = ?,
            expires_at = ?,
            location_name = ?,
            is_active = 1,
            updated_at = datetime('now')
        WHERE user_id = ? AND location_id = ?
      `).run(
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        expiresAt,
        location.name,
        session.user.id,
        tokenResponse.location_id
      );
    } else {
      // Insert new connection
      db.prepare(`
        INSERT INTO hubrise_connections
        (user_id, location_id, location_name, access_token, refresh_token, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        session.user.id,
        tokenResponse.location_id,
        location.name,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        expiresAt
      );
    }

    // Setup webhook
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/hubrise/webhook`;
      await hubRiseClient.setupWebhook(
        tokenResponse.location_id,
        tokenResponse.access_token,
        webhookUrl,
        ['order.create', 'order.update']
      );
    } catch (webhookError) {
      console.error('Failed to setup webhook:', webhookError);
      // Don't fail the whole flow if webhook setup fails
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL('/settings/integrations?success=true', req.url)
    );
  } catch (error) {
    console.error('HubRise callback error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=callback_failed', req.url)
    );
  }
}
