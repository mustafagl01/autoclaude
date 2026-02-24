/**
 * HubRise OAuth - Callback Handler (Vercel Postgres)
 * Handles OAuth callback and stores connection in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getHubRiseClient } from '@/lib/hubrise-client';

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await auth();
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
    const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    // Store in database
    const userId = session.user.id;

    // Check if connection already exists
    const existing = await sql`
      SELECT id FROM hubrise_connections
      WHERE user_id = ${userId} AND location_id = ${tokenResponse.location_id}
    `;

    if (existing.rowCount > 0) {
      // Update existing connection
      await sql`
        UPDATE hubrise_connections
        SET access_token = ${tokenResponse.access_token},
            refresh_token = ${tokenResponse.refresh_token},
            expires_at = ${expiresAt.toISOString()},
            location_name = ${location.name},
            is_active = true,
            updated_at = NOW()
        WHERE user_id = ${userId} AND location_id = ${tokenResponse.location_id}
      `;
    } else {
      // Insert new connection
      await sql`
        INSERT INTO hubrise_connections
        (user_id, location_id, location_name, access_token, refresh_token, expires_at, created_at, updated_at)
        VALUES (${userId}, ${tokenResponse.location_id}, ${location.name},
                ${tokenResponse.access_token}, ${tokenResponse.refresh_token}, ${expiresAt.toISOString()}, NOW(), NOW())
      `;
    }

    // Setup webhook
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
      const webhookUrl = `${baseUrl}/api/hubrise/webhook`;
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
