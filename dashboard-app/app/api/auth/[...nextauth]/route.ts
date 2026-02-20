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
  trustHost: true, // Vercel / production'da "Host must be trusted" hatasını önler
  providers: [
    ...(hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET")
      ? [
          GoogleProvider({
            clientId: requireEnv("GOOGLE_CLIENT_ID"),
            clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
              },
            },
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
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    // Google/Apple ile girenleri Postgres'e kaydet veya hesabı bağla; session'da DB id kullanılsın
    async signIn({ user, account }) {
      if (account?.provider === "credentials") return true;

      if (account?.provider === "google" || account?.provider === "apple") {
        try {
          if (!user.email) return false;

          const dbUser = await getUserByEmail(user.email);

          if (!dbUser) {
            const userId = crypto.randomUUID();
            const result = await createUser({
              id: userId,
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image || null,
              password_hash: null,
              google_id: account.provider === "google" ? account.providerAccountId : null,
              apple_id: account.provider === "apple" ? account.providerAccountId : null,
            });
            return result.success;
          }

          if (account.provider === "google" && !dbUser.google_id) {
            await updateUser(dbUser.id, { google_id: account.providerAccountId });
          }
          if (account.provider === "apple" && !dbUser.apple_id) {
            await updateUser(dbUser.id, { apple_id: account.providerAccountId });
          }
          return true;
        } catch (error) {
          console.error("OAuth signIn error:", error);
          console.error("Error details:", {
            provider: account?.provider,
            email: user.email,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
          return false;
        }
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        // Credentials: authorize() DB'den user döndü, user.id gerçek id. OAuth: signIn'de DB'ye yazdık, email ile bulup id alalım.
        if (user.email) {
          try {
            const dbUser = await getUserByEmail(user.email);
            if (dbUser) token.id = dbUser.id;
            else if (user.id) token.id = user.id;
          } catch (_) {
            if (user.id) token.id = user.id;
          }
        } else if (user.id) token.id = user.id;
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
  // NEXTAUTH_URL kontrolü - production'da mutlaka set edilmeli
  ...(process.env.NEXTAUTH_URL ? {} : {
    // NEXTAUTH_URL yoksa trustHost ile otomatik algılanır ama yine de loglayalım
    // (Vercel'de genelde otomatik algılanır ama manuel set etmek daha güvenli)
  }),
};

// Startup'da env var kontrolü (sadece log için)
if (process.env.NODE_ENV === 'production') {
  const hasGoogle = hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET");
  const hasNextAuthUrl = hasEnv("NEXTAUTH_URL");
  console.log("[NextAuth] Config check:", {
    googleConfigured: hasGoogle,
    nextAuthUrlSet: hasNextAuthUrl,
    nextAuthUrl: hasNextAuthUrl ? process.env.NEXTAUTH_URL : "(not set - using trustHost)",
  });
}

// Middleware ve testler için alias
export const authConfig = authOptions;

// V5 Export syntax'ı:
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

// Next.js App Router (Route Handlers) için GET ve POST
export const GET = handlers.GET;
export const POST = handlers.POST;