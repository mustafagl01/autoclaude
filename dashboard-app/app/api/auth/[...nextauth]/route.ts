/**
 * NextAuth.js v5 Configuration (Vercel Postgres version)
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Supports:
 * - Google OAuth
 * - Apple Sign-In
 * - Email/Password (Credentials)
 *
 * NOTE:
 * - Cloudflare D1 usage removed (no process.env.DB)
 * - Uses @vercel/postgres-backed functions in /lib/db.ts (no db param)
 */

import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import CredentialsProvider from 'next-auth/providers/credentials';

import {
  getUserByEmail,
  getUserByGoogleId,
  getUserByAppleId,
  createUser,
  updateUser,
} from '@/lib/db';

import { verifyPassword, validatePasswordStrength } from '@/lib/auth';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AuthSession {
  user: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

// ============================================================================
// Helpers
// ============================================================================

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`Missing env var: ${name}`);
  return v;
}

function hasEnv(name: string): boolean {
  const v = process.env[name];
  return !!v && v.trim() !== '';
}

// ============================================================================
// NextAuth Configuration
// ============================================================================

export const authConfig: NextAuthConfig = {
  providers: [
    // Only register providers when env vars exist.
    // This avoids provider init crashes in production when secrets are missing.
    ...(hasEnv('GOOGLE_CLIENT_ID') && hasEnv('GOOGLE_CLIENT_SECRET')
      ? [
          GoogleProvider({
            clientId: requireEnv('GOOGLE_CLIENT_ID'),
            clientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),

    ...(hasEnv('APPLE_ID') &&
    hasEnv('APPLE_TEAM_ID') &&
    hasEnv('APPLE_PRIVATE_KEY') &&
    hasEnv('APPLE_KEY_ID')
      ? [
          AppleProvider({
            clientId: requireEnv('APPLE_ID'),
            clientSecret: {
              appleId: requireEnv('APPLE_ID'),
              teamId: requireEnv('APPLE_TEAM_ID'),
              privateKey: requireEnv('APPLE_PRIVATE_KEY').replace(/\
/g, '
'),
              keyId: requireEnv('APPLE_KEY_ID'),
            },
          }),
        ]
      : []),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Keep your existing rule (though note: some apps validate strength at signup, not login)
        const strengthCheck = validatePasswordStrength(credentials.password as string);
        if (!strengthCheck.valid) return null;

        try {
          const user = await getUserByEmail(credentials.email as string);

          if (!user) return null;
          if (!user.password_hash) return null;

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
        } catch {
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        // Google OAuth sign-in
        if (account?.provider === 'google') {
          const googleId = account.providerAccountId;

          let existingUser = await getUserByGoogleId(googleId);
          if (existingUser) return true;

          existingUser = await getUserByEmail(user.email);
          if (existingUser) {
            const linkResult = await updateUser(existingUser.id, { google_id: googleId });
            return !!linkResult.success;
          }

          const userId = crypto.randomUUID();
          const createResult = await createUser({
            id: userId,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image || null,
            google_id: googleId,
            password_hash: null,
          });

          return !!createResult.success;
        }

        // Apple OAuth sign-in
        if (account?.provider === 'apple') {
          const appleId = account.providerAccountId;

          let existingUser = await getUserByAppleId(appleId);
          if (existingUser) return true;

          existingUser = await getUserByEmail(user.email);
          if (existingUser) {
            const linkResult = await updateUser(existingUser.id, { apple_id: appleId });
            return !!linkResult.success;
          }

          const userId = crypto.randomUUID();
          const createResult = await createUser({
            id: userId,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image || null,
            apple_id: appleId,
            password_hash: null,
          });

          return !!createResult.success;
        }

        // Credentials provider: allow (authorize already verified and returned user)
        if (account?.provider === 'credentials') return true;

        // Unknown provider
        return false;
      } catch {
        return false;
      }
    },

    async jwt({ token, user, account }) {
      // On initial sign-in, attach DB user ID to token
      if (user && account && user.email) {
        try {
          const dbUser = await getUserByEmail(user.email);
          if (dbUser) {
            (token as any).userId = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.picture = dbUser.image ?? undefined;
          }
        } catch {
          // ignore
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token as any).userId as string;
      }
      return session;
    },
  },

  debug:
    process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG === 'true',

  secret: process.env.NEXTAUTH_SECRET,
};

// ============================================================================
// NextAuth Route Handlers
// ============================================================================

export const runtime = 'nodejs';

export function GET(request: Request) {
  return NextAuth(authConfig)(request);
}

export function POST(request: Request) {
  return NextAuth(authConfig)(request);
}

export async function auth() {
  const handler = NextAuth(authConfig) as unknown as { auth: () => Promise<unknown> };
  return handler.auth();
}    image?: string | null;
  };
  expires: string;
}

// ============================================================================
// NextAuth Configuration
// ============================================================================

/**
 * NextAuth configuration object
 *
 * This configuration defines:
 * - Google OAuth provider for authentication
 * - Apple Sign-In provider for authentication
 * - Email/Password credentials provider for authentication
 * - JWT strategy for session management
 * - Custom callbacks for user lookup and creation
 * - Custom pages for login
 */
export const authConfig: NextAuthConfig = {
  // ----------------------------------------------------------------------------
  // Authentication Providers
  // ----------------------------------------------------------------------------

  /**
   * Google OAuth provider
   *
   * Users can sign in with their Google account.
   * On first sign-in, a user record is created in the D1 database.
   *
   * @see https://console.cloud.google.com/ - Get OAuth credentials
   */
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // Allow authorization in HTTP for local development
      allowDangerousEmailAccountLinking: false,
    }),
    /**
     * Apple Sign-In provider
     *
     * Users can sign in with their Apple ID.
     * On first sign-in, a user record is created in the D1 database.
     *
     * Apple Sign-In requires JWT verification using private key and team ID.
     *
     * @see https://developer.apple.com/sign-in-with-apple/ - Get credentials
     */
    AppleProvider({
      clientId: process.env.APPLE_ID || '',
      clientSecret: {
        appleId: process.env.APPLE_ID || '',
        teamId: process.env.APPLE_TEAM_ID || '',
        privateKey: process.env.APPLE_PRIVATE_KEY || '',
        keyId: process.env.APPLE_KEY_ID || '',
      },
    }),
    /**
     * Email/Password credentials provider
     *
     * Users can sign in with their email and password.
     * Passwords are verified against bcrypt hashes stored in D1 database.
     *
     * New user registration is handled separately (not through this provider).
     * This provider is for existing users to sign in.
     *
     * @see https://next-auth.js.org/providers/credentials
     */
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'user@example.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      /**
       * Authorize function for credentials provider
       *
       * This function is called when a user attempts to sign in with email/password.
       * It validates the credentials against the D1 database.
       *
       * @param credentials - Email and password from login form
       * @returns User object if credentials are valid, null otherwise
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Validate password strength
        const strengthCheck = validatePasswordStrength(credentials.password as string);
        if (!strengthCheck.valid) {
          // Don't expose specific error for security (prevents user enumeration)
          return null;
        }

        try {
          // Get D1 database instance
          const env = process.env as unknown as { DB?: D1Database };
          const db = env?.DB;

          if (!db) {
            // Database not available - deny sign-in
            return null;
          }

          // Look up user by email
          const user = await getUserByEmail(db, credentials.email as string);

          if (!user) {
            // User not found
            return null;
          }

          // Check if user has a password hash
          // OAuth-only users (Google/Apple) will have null password_hash
          if (!user.password_hash) {
            // User exists but doesn't have a password
            // They need to sign in with OAuth or set a password
            return null;
          }

          // Verify password against hash
          const verifyResult = await verifyPassword(
            credentials.password as string,
            user.password_hash
          );

          if (!verifyResult.success || !verifyResult.valid) {
            // Invalid password
            return null;
          }

          // Credentials are valid, return user object
          // This will be attached to the JWT token
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          // Log error but don't expose details to user
          // In production, this should be logged to error tracking service
          return null;
        }
      },
    }),
  ],

  // ----------------------------------------------------------------------------
  // Session Strategy
  // ----------------------------------------------------------------------------

  /**
   * JWT (JSON Web Token) strategy for session management
   *
   * Sessions are stored in JWT tokens, not in the database.
   * This is stateless and works well with Cloudflare Pages edge functions.
   *
   * @see https://next-auth.js.org/configuration/options#session
   */
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ----------------------------------------------------------------------------
  // Custom Pages
  // ----------------------------------------------------------------------------

  /**
   * Custom login page
   *
   * Users will be redirected to /login when authentication is required.
   * The login page will be created in subtask 5-1.
   */
  pages: {
    signIn: '/login',
    error: '/login', // Show errors on login page
    // signOut: '/login', // Redirect to login after signout
    // newUser: '/dashboard', // Redirect new users to dashboard after first login
  },

  // ----------------------------------------------------------------------------
  // Callbacks
  // ----------------------------------------------------------------------------

  /**
   * Sign in callback
   *
   * This callback is called whenever a user attempts to sign in.
   * It handles:
   * - Looking up existing users by email or OAuth ID
   * - Creating new user records on first sign-in
   * - Linking OAuth accounts to existing users
   *
   * @param params - Contains user, account, profile from OAuth provider
   * @returns true to allow sign in, false to deny
   *
   * @example
   * // On first Google sign-in, user is created in D1:
   * // 1. Check if user exists by Google ID
   * // 2. If not, check if user exists by email
   * // 3. If not, create new user with Google ID
   */
  async signIn({ user, account, profile }) {
    if (!user.email) {
      return false; // Deny sign-in without email
    }

    try {
      // Get D1 database instance
      // In Next.js with Cloudflare Pages, DB binding is available via process.env
      const env = process.env as unknown as { DB?: D1Database };
      const db = env?.DB;

      if (!db) {
        // Database not available - deny sign-in
        return false;
      }

      // Google OAuth sign-in
      if (account?.provider === 'google') {
        const googleId = account.providerAccountId;

        // Check if user exists by Google ID
        let existingUser = await getUserByGoogleId(db, googleId);

        if (existingUser) {
          // User exists with this Google ID, allow sign-in
          return true;
        }

        // Check if user exists by email (account merging scenario)
        existingUser = await getUserByEmail(db, user.email);

        if (existingUser) {
          // User exists with this email but no Google ID
          // Link Google account to existing user
          const linkResult = await updateUser(db, existingUser.id, {
            google_id: googleId,
          });

          if (!linkResult.success) {
            // Failed to link account
            return false;
          }

          // Account linked successfully, allow sign-in
          return true;
        }

        // Create new user
        const userId = crypto.randomUUID();
        const createResult = await createUser(db, {
          id: userId,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          image: user.image || null,
          google_id: googleId,
          // No password for OAuth users
          password_hash: null,
        });

        if (!createResult.success) {
          // Failed to create user, deny sign-in
          return false;
        }

        // New user created successfully
        return true;
      }

      // Apple Sign-In
      if (account?.provider === 'apple') {
        const appleId = account.providerAccountId;

        // Check if user exists by Apple ID
        let existingUser = await getUserByAppleId(db, appleId);

        if (existingUser) {
          // User exists with this Apple ID, allow sign-in
          return true;
        }

        // Check if user exists by email (account merging scenario)
        existingUser = await getUserByEmail(db, user.email);

        if (existingUser) {
          // User exists with this email but no Apple ID
          // Link Apple account to existing user
          const linkResult = await updateUser(db, existingUser.id, {
            apple_id: appleId,
          });

          if (!linkResult.success) {
            // Failed to link account
            return false;
          }

          // Account linked successfully, allow sign-in
          return true;
        }

        // Create new user
        const userId = crypto.randomUUID();
        const createResult = await createUser(db, {
          id: userId,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          image: user.image || null,
          apple_id: appleId,
          // No password for OAuth users
          password_hash: null,
        });

        if (!createResult.success) {
          // Failed to create user, deny sign-in
          return false;
        }

        // New user created successfully
        return true;
      }

      // Credentials provider doesn't go through signIn callback
      // It returns user object directly from authorize function
      return false;
    } catch (error) {
      // Log error but don't expose details to user
      // In production, this should be logged to error tracking service
      return false;
    }
  },

  /**
   * JWT callback
   *
   * This callback is called whenever a JWT is created or updated.
   * It attaches the database user ID to the JWT token.
   *
   * The user ID in the token is used in subsequent requests to:
   * - Query the database for user-specific data
   * - Log audit events
   * - Validate permissions
   *
   * @param params - Contains token, user, account from sign-in
   * @returns Updated JWT token
   *
   * @example
   * // After sign-in, token contains:
   * // {
   * //   userId: "uuid-from-database",
   * //   email: "user@example.com",
   * //   name: "John Doe",
   * //   picture: "https://..."
   * // }
   */
  async jwt({ token, user, account }) {
    // Initial sign-in: attach user ID to token
    if (user && account) {
      try {
        const env = process.env as unknown as { DB?: D1Database };
        const db = env?.DB;

        if (db && user.email) {
          // Look up user by email to get database ID
          const dbUser = await getUserByEmail(db, user.email);

          if (dbUser) {
            token.userId = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.picture = dbUser.image;
          }
        }
      } catch (error) {
        // If lookup fails, continue without user ID
        // Token will still have basic user info from OAuth
      }
    }

    return token;
  },

  /**
   * Session callback
   *
   * This callback is called whenever the session is checked.
   * It adds the user ID from the JWT token to the session object.
   *
   * The session is available in:
   * - Server components via getServerSession()
   * - Client components via useSession() hook
   *
   * @param params - Contains session and token
   * @returns Updated session object
   *
   * @example
   * // In a Server Component:
   * // const session = await getServerSession();
   * // if (session?.user?.id) {
   * //   const calls = await getCallsByUserId(db, session.user.id);
   * // }
   */
  async session({ session, token }) {
    if (token && session.user) {
      // Attach user ID from token to session
      session.user.id = token.userId as string;
    }

    return session;
  },

  // ----------------------------------------------------------------------------
  // Security & Debug
  // ----------------------------------------------------------------------------

  /**
   * Enable debug mode in development
   *
   * Set NEXTAUTH_DEBUG=true in .env.local to enable detailed logging
   */
  debug: process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG === 'true',

  /**
   * Secret key for JWT encryption
   *
   * This must be set in production. Generate with:
   * openssl rand -base64 32
   */
  secret: process.env.NEXTAUTH_SECRET,
};

// ============================================================================
// NextAuth Route Handlers
// ============================================================================

/**
 * NextAuth route handler for GET requests
 *
 * Handles:
 * - OAuth authorization flows
 * - Session management
 * - CSRF token validation
 *
 * @param request - Next.js Request object
 * @returns Next.js Response object
 */
export function GET(request: Request) {
  return NextAuth(authConfig)(request);
}

/**
 * NextAuth route handler for POST requests
 *
 * Handles:
 * - OAuth callback handling
 * - Sign-out requests
 * - CSRF token validation
 *
 * @param request - Next.js Request object
 * @returns Next.js Response object
 */
export function POST(request: Request) {
  return NextAuth(authConfig)(request);
}

export async function auth() {
  const handler = NextAuth(authConfig) as unknown as { auth: () => Promise<unknown> };
  return handler.auth();
}
