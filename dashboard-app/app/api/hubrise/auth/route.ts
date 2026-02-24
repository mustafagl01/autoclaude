/**
 * HubRise OAuth - Start Authorization (Vercel Postgres)
 * Redirects user to HubRise OAuth page
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getHubRiseClient } from '@/lib/hubrise-client';

export async function GET(req: NextRequest) {
  try {
    // Check session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate state parameter for security
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })).toString('base64');

    // Get HubRise client
    const hubRiseClient = getHubRiseClient();

    // Generate auth URL with redirect URI
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/api/hubrise/callback`;
    const authUrl = hubRiseClient.getAuthUrl(state);

    // Redirect to HubRise OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('HubRise auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate HubRise authorization' },
      { status: 500 }
    );
  }
}
