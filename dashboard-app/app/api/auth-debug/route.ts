import { NextResponse } from "next/server";

/**
 * Debug endpoint: Check if OAuth env vars are loaded (no secrets exposed).
 * Hit: GET /api/auth-debug
 * (Under /api/auth/* is handled by NextAuth, so this lives at /api/auth-debug.)
 */
export async function GET() {
  const has = (name: string) => {
    const v = process.env[name];
    return !!v && v.trim() !== "";
  };

  const googleOk = has("GOOGLE_CLIENT_ID") && has("GOOGLE_CLIENT_SECRET");
  const appleOk =
    has("APPLE_ID") &&
    has("APPLE_TEAM_ID") &&
    has("APPLE_PRIVATE_KEY") &&
    has("APPLE_KEY_ID");
  const nextAuthUrl = process.env.NEXTAUTH_URL || "(not set)";

  return NextResponse.json({
    google: googleOk ? "configured" : "missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET",
    apple: appleOk ? "configured" : "missing APPLE_* env vars",
    nextAuthUrl: nextAuthUrl === "(not set)" ? nextAuthUrl : "set",
  });
}
