import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";

import { getUserByEmail, createUser, updateUser } from "@/lib/db";
import { verifyPassword, validatePasswordStrength } from "@/lib/auth";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

function hasEnv(name: string): boolean {
  const v = process.env[name];
  return !!v && v.trim() !== "";
}

// v5 için NextAuthConfig kullanıyoruz
export const authOptions: NextAuthConfig = {
  providers: [
    ...(hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET")
      ? [
          GoogleProvider({
            clientId: requireEnv("GOOGLE_CLIENT_ID"),
            clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
          }),
        ]
      : []),
    ...(hasEnv("APPLE_ID") &&
    hasEnv("APPLE_TEAM_ID") &&
    hasEnv("APPLE_PRIVATE_KEY") &&
    hasEnv("APPLE_KEY_ID")
      ? [
          AppleProvider({
            clientId: requireEnv("APPLE_ID"),
            clientSecret: {
              appleId: requireEnv("APPLE_ID"),
              teamId: requireEnv("APPLE_TEAM_ID"),
              privateKey: requireEnv("APPLE_PRIVATE_KEY").replace(/\n/g, "\n"),
              keyId: requireEnv("APPLE_KEY_ID"),
            },
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const strengthCheck = validatePasswordStrength(credentials.password as string);
        if (!strengthCheck.valid) return null;

        try {
          const user = await getUserByEmail(credentials.email as string);
          if (!user || !user.password_hash) return null;

          const verifyResult = await verifyPassword(
            credentials.password as string,
            user.password_hash
          );

          if (!verifyResult.success || !verifyResult.valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "mgl-fallback-secret-12345",
  debug: true, // Vercel loglarında hatayı görmek için debug'ı açıyoruz
};

// V5 Export syntax'ı:
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// Next.js App Router (Route Handlers) için GET ve POST
export const GET = handlers.GET;
export const POST = handlers.POST;