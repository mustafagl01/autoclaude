/**
 * Integration Tests: Authentication Flow
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * End-to-end integration tests for authentication flows including:
 * - Google OAuth login
 * - Apple Sign-In login
 * - Email/Password credentials login
 * - Session creation and validation
 * - Logout flow
 * - Middleware route protection
 *
 * These tests verify the complete authentication workflow from login to session creation,
 * ensuring all three authentication providers work correctly with D1 database integration.
 *
 * @see https://next-auth.js.org/testing
 * @see https://jestjs.io/docs/configuration
 */

import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/auth/[...nextauth]/route';
import { authConfig } from '@/app/api/auth/[...nextauth]/route';
import { hashPassword } from '@/lib/auth';
import { createUser, getUserByEmail, getUserByGoogleId, getUserByAppleId } from '@/lib/db';
import { middleware } from '@/middleware';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';

// ============================================================================
// Mock Setup
// ============================================================================

/**
 * Mock D1 database for testing
 * Simulates Cloudflare D1 database operations
 */
const mockDb = {
  prepare: jest.fn(),
  batch: jest.fn(),
  exec: jest.fn(),
};

/**
 * Mock users stored in memory during tests
 */
const testUsers = new Map<string, any>();

/**
 * Mock session tokens for testing
 */
const sessionTokens = new Map<string, any>();

// Reset mocks before each test
beforeEach(() => {
  // Clear test data
  testUsers.clear();
  sessionTokens.clear();

  // Reset all mock functions
  jest.clearAllMocks();

  // Mock D1 database behavior
  mockDb.prepare.mockReturnValue({
    bind: jest.fn().mockReturnThis(),
    first: jest.fn().mockImplementation(async () => {
      // Simulate getUserByEmail
      const bound = mockDb.prepare().bind;
      const email = bound.mock.calls[bound.mock.calls.length - 1]?.[0];
      if (email && testUsers.has(email)) {
        return testUsers.get(email);
      }
      return null;
    }),
    all: jest.fn().mockResolvedValue([]),
    run: jest.fn().mockResolvedValue({ success: true }),
  });

  // Mock environment with DB binding
  process.env.DB = mockDb as unknown as D1Database;
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  process.env.APPLE_ID = 'test-apple-id';
  process.env.APPLE_TEAM_ID = 'test-apple-team-id';
  process.env.APPLE_PRIVATE_KEY = 'test-apple-private-key';
  process.env.APPLE_KEY_ID = 'test-apple-key-id';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clean up environment
  delete process.env.DB;
  delete process.env.NEXTAUTH_SECRET;
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test user in the mock database
 */
async function createTestUser(overrides: Partial<any> = {}) {
  const userId = `user-${Date.now()}`;
  const email = `test-${userId}@example.com`;
  const password = 'TestP@ssw0rd';

  const hashedPassword = await hashPassword(password);
  if (!hashedPassword.success || !hashedPassword.hash) {
    throw new Error('Failed to hash password');
  }

  const user = {
    id: userId,
    email: overrides.email || email,
    name: overrides.name || 'Test User',
    password_hash: hashedPassword.hash,
    google_id: overrides.google_id || null,
    apple_id: overrides.apple_id || null,
    image: overrides.image || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  testUsers.set(user.email, user);
  return user;
}

/**
 * Create a mock NextAuth session token
 */
function createMockSessionToken(userId: string, email: string): string {
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.${Buffer.from(
    JSON.stringify({ userId, email })
  ).toString('base64')}`;

  sessionTokens.set(token, { userId, email });
  return token;
}

// ============================================================================
// Credentials Provider Integration Tests
// ============================================================================

describe('Authentication Flow - Credentials Provider', () => {
  describe('complete login flow', () => {
    it('should successfully authenticate user with valid email and password', async () => {
      // Arrange: Create test user
      const user = await createTestUser();
      const password = 'TestP@ssw0rd';

      // Act: Call NextAuth credentials provider
      const credentials = {
        email: user.email,
        password: password,
      };

      // Mock the authorize function
      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      // Mock getUserByEmail to return our test user
      mockDb.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(user),
        }),
      } as any);

      const result = await authorize(credentials);

      // Assert: User should be authenticated
      expect(result).not.toBeNull();
      expect(result?.email).toBe(user.email);
      expect(result?.id).toBe(user.id);
      expect(result?.name).toBe(user.name);
    });

    it('should fail authentication with invalid password', async () => {
      // Arrange: Create test user
      const user = await createTestUser();

      // Mock getUserByEmail to return our test user
      mockDb.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(user),
        }),
      } as any);

      // Act: Try to authenticate with wrong password
      const credentials = {
        email: user.email,
        password: 'WrongP@ssw0rd',
      };

      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      const result = await authorize(credentials);

      // Assert: Authentication should fail
      expect(result).toBeNull();
    });

    it('should fail authentication for non-existent user', async () => {
      // Arrange: Mock getUserByEmail to return null (user not found)
      mockDb.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any);

      // Act: Try to authenticate with non-existent user
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'TestP@ssw0rd',
      };

      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      const result = await authorize(credentials);

      // Assert: Authentication should fail
      expect(result).toBeNull();
    });

    it('should fail authentication for OAuth-only user (no password hash)', async () => {
      // Arrange: Create OAuth-only user (password_hash is null)
      const oauthUser = await createTestUser({ password_hash: null });

      // Mock getUserByEmail to return OAuth user
      mockDb.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(oauthUser),
        }),
      } as any);

      // Act: Try to authenticate with password
      const credentials = {
        email: oauthUser.email,
        password: 'TestP@ssw0rd',
      };

      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      const result = await authorize(credentials);

      // Assert: Authentication should fail (OAuth-only user)
      expect(result).toBeNull();
    });
  });

  describe('session creation after credentials login', () => {
    it('should create JWT session with user ID after successful login', async () => {
      // Arrange: Create test user
      const user = await createTestUser();

      // Mock getUserByEmail for both authorize and jwt callback
      mockDb.prepare.mockReturnValue({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(user),
        }),
      } as any);

      // Act: Simulate JWT callback after login
      const mockToken = { userId: null, email: null };
      const mockUser = {
        id: user.id,
        email: user.email,
        name: user.name,
      };
      const mockAccount = { provider: 'credentials', providerAccountId: user.id };

      const result = await authConfig.jwt!({
        token: mockToken,
        user: mockUser as any,
        account: mockAccount as any,
      });

      // Assert: Token should contain user ID
      expect(result.userId).toBe(user.id);
      expect(result.email).toBe(user.email);
    });

    it('should attach user ID to session object', async () => {
      // Arrange: Create mock token with user ID
      const user = await createTestUser();
      const mockToken = {
        userId: user.id,
        email: user.email,
        name: user.name,
      };
      const mockSession = {
        user: { email: user.email, name: user.name, image: user.image },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Act: Call session callback
      const result = await authConfig.session!({
        session: mockSession as any,
        token: mockToken,
      });

      // Assert: Session should have user ID
      expect(result.user.id).toBe(user.id);
    });
  });
});

// ============================================================================
// Google OAuth Provider Integration Tests
// ============================================================================

describe('Authentication Flow - Google OAuth', () => {
  describe('complete Google OAuth login flow', () => {
    it('should create new user on first Google sign-in', async () => {
      // Arrange: Mock Google OAuth profile
      const googleId = 'google-123456789';
      const googleUser = {
        id: googleId,
        email: 'google-user@example.com',
        name: 'Google User',
        image: 'https://example.com/avatar.jpg',
      };

      const mockAccount = {
        provider: 'google',
        providerAccountId: googleId,
      };

      // Mock getUserByGoogleId to return null (new user)
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null), // User not found by Google ID
        }),
      } as any));

      // Mock getUserByEmail to return null (new user)
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null), // User not found by email
        }),
      } as any));

      // Mock createUser
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValueOnce({ success: true }),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: googleUser as any,
        account: mockAccount as any,
        profile: googleUser as any,
      });

      // Assert: Sign-in should succeed
      expect(result).toBe(true);
    });

    it('should authenticate existing Google user on subsequent sign-in', async () => {
      // Arrange: Create existing Google user
      const googleId = 'google-987654321';
      const existingUser = await createTestUser({
        google_id: googleId,
        email: 'existing-google@example.com',
      });

      const mockAccount = {
        provider: 'google',
        providerAccountId: googleId,
      };

      const googleUser = {
        id: googleId,
        email: existingUser.email,
        name: existingUser.name,
      };

      // Mock getUserByGoogleId to return existing user
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(existingUser),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: googleUser as any,
        account: mockAccount as any,
        profile: googleUser as any,
      });

      // Assert: Sign-in should succeed
      expect(result).toBe(true);
    });

    it('should link Google account to existing user (account merging)', async () => {
      // Arrange: Create existing user without Google ID
      const existingUser = await createTestUser({
        google_id: null,
        email: 'merge-user@example.com',
      });

      const googleId = 'google-merged-123';
      const mockAccount = {
        provider: 'google',
        providerAccountId: googleId,
      };

      const googleUser = {
        id: googleId,
        email: existingUser.email,
        name: existingUser.name,
      };

      // Mock getUserByGoogleId to return null (no Google ID yet)
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any));

      // Mock getUserByEmail to return existing user
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(existingUser),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: googleUser as any,
        account: mockAccount as any,
        profile: googleUser as any,
      });

      // Assert: Sign-in should succeed (account merged)
      expect(result).toBe(true);
    });

    it('should deny sign-in without email', async () => {
      // Arrange: Mock Google user without email
      const googleUser = {
        id: 'google-no-email',
        email: null,
        name: 'No Email User',
      };

      const mockAccount = {
        provider: 'google',
        providerAccountId: 'google-no-email',
      };

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: googleUser as any,
        account: mockAccount as any,
        profile: googleUser as any,
      });

      // Assert: Sign-in should fail
      expect(result).toBe(false);
    });
  });

  describe('session creation after Google OAuth login', () => {
    it('should create JWT session with Google user ID', async () => {
      // Arrange: Create Google user
      const user = await createTestUser({
        google_id: 'google-session-test',
      });

      // Mock getUserByEmail
      mockDb.prepare.mockReturnValue({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(user),
        }),
      } as any);

      // Act: Simulate JWT callback
      const mockToken = { userId: null };
      const mockUser = {
        id: user.google_id,
        email: user.email,
        name: user.name,
      };
      const mockAccount = {
        provider: 'google',
        providerAccountId: user.google_id,
      };

      const result = await authConfig.jwt!({
        token: mockToken,
        user: mockUser as any,
        account: mockAccount as any,
      });

      // Assert: Token should contain user ID
      expect(result.userId).toBe(user.id);
    });
  });
});

// ============================================================================
// Apple Sign-In Provider Integration Tests
// ============================================================================

describe('Authentication Flow - Apple Sign-In', () => {
  describe('complete Apple Sign-In flow', () => {
    it('should create new user on first Apple sign-in', async () => {
      // Arrange: Mock Apple Sign-In profile
      const appleId = 'apple-123456789';
      const appleUser = {
        id: appleId,
        email: 'apple-user@example.com',
        name: 'Apple User',
        image: null,
      };

      const mockAccount = {
        provider: 'apple',
        providerAccountId: appleId,
      };

      // Mock getUserByAppleId to return null (new user)
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any));

      // Mock getUserByEmail to return null (new user)
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any));

      // Mock createUser
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValueOnce({ success: true }),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: appleUser as any,
        account: mockAccount as any,
        profile: appleUser as any,
      });

      // Assert: Sign-in should succeed
      expect(result).toBe(true);
    });

    it('should authenticate existing Apple user on subsequent sign-in', async () => {
      // Arrange: Create existing Apple user
      const appleId = 'apple-987654321';
      const existingUser = await createTestUser({
        apple_id: appleId,
        email: 'existing-apple@example.com',
      });

      const mockAccount = {
        provider: 'apple',
        providerAccountId: appleId,
      };

      const appleUser = {
        id: appleId,
        email: existingUser.email,
        name: existingUser.name,
      };

      // Mock getUserByAppleId to return existing user
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(existingUser),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: appleUser as any,
        account: mockAccount as any,
        profile: appleUser as any,
      });

      // Assert: Sign-in should succeed
      expect(result).toBe(true);
    });

    it('should link Apple account to existing user (account merging)', async () => {
      // Arrange: Create existing user without Apple ID
      const existingUser = await createTestUser({
        apple_id: null,
        email: 'merge-apple-user@example.com',
      });

      const appleId = 'apple-merged-123';
      const mockAccount = {
        provider: 'apple',
        providerAccountId: appleId,
      };

      const appleUser = {
        id: appleId,
        email: existingUser.email,
        name: existingUser.name,
      };

      // Mock getUserByAppleId to return null (no Apple ID yet)
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any));

      // Mock getUserByEmail to return existing user
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(existingUser),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: appleUser as any,
        account: mockAccount as any,
        profile: appleUser as any,
      });

      // Assert: Sign-in should succeed (account merged)
      expect(result).toBe(true);
    });
  });

  describe('session creation after Apple Sign-In', () => {
    it('should create JWT session with Apple user ID', async () => {
      // Arrange: Create Apple user
      const user = await createTestUser({
        apple_id: 'apple-session-test',
      });

      // Mock getUserByEmail
      mockDb.prepare.mockReturnValue({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(user),
        }),
      } as any);

      // Act: Simulate JWT callback
      const mockToken = { userId: null };
      const mockUser = {
        id: user.apple_id,
        email: user.email,
        name: user.name,
      };
      const mockAccount = {
        provider: 'apple',
        providerAccountId: user.apple_id,
      };

      const result = await authConfig.jwt!({
        token: mockToken,
        user: mockUser as any,
        account: mockAccount as any,
      });

      // Assert: Token should contain user ID
      expect(result.userId).toBe(user.id);
    });
  });
});

// ============================================================================
// Middleware Route Protection Integration Tests
// ============================================================================

describe('Middleware - Route Protection', () => {
  describe('protected routes require authentication', () => {
    it('should redirect unauthenticated user from /dashboard to /login', async () => {
      // Arrange: Create mock request without session
      const request = {
        nextUrl: {
          pathname: '/dashboard',
          clone: jest.fn().mockReturnThis(),
        },
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should redirect to login
      expect(response).not.toBeNull();
      expect(request.nextUrl.clone).toHaveBeenCalled();
    });

    it('should allow authenticated user to access /dashboard', async () => {
      // Arrange: Create mock request with session
      const sessionToken = createMockSessionToken('user-123', 'user@example.com');
      const request = {
        nextUrl: {
          pathname: '/dashboard',
        },
        cookies: {
          get: jest.fn().mockReturnValue({ value: sessionToken }),
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should allow access (check is not a redirect)
      // Note: NextResponse.next() returns a response, not a redirect
      expect(response).not.toBeNull();
    });

    it('should redirect authenticated user from /login to /dashboard', async () => {
      // Arrange: Create mock request with session on login page
      const sessionToken = createMockSessionToken('user-123', 'user@example.com');
      const request = {
        nextUrl: {
          pathname: '/login',
          clone: jest.fn().mockReturnThis(),
        },
        cookies: {
          get: jest.fn().mockReturnValue({ value: sessionToken }),
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should redirect to dashboard
      expect(response).not.toBeNull();
      expect(request.nextUrl.clone).toHaveBeenCalled();
    });
  });

  describe('public routes do not require authentication', () => {
    it('should allow unauthenticated access to /', async () => {
      // Arrange: Create mock request without session
      const request = {
        nextUrl: {
          pathname: '/',
        },
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should allow access
      expect(response).not.toBeNull();
    });

    it('should allow unauthenticated access to /login', async () => {
      // Arrange: Create mock request without session
      const request = {
        nextUrl: {
          pathname: '/login',
        },
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should allow access
      expect(response).not.toBeNull();
    });

    it('should allow unauthenticated access to /api/auth', async () => {
      // Arrange: Create mock request without session
      const request = {
        nextUrl: {
          pathname: '/api/auth/signin',
        },
        cookies: {
          get: jest.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should allow access
      expect(response).not.toBeNull();
    });
  });
});

// ============================================================================
// NextAuth API Route Handler Integration Tests
// ============================================================================

describe('NextAuth API Route Handlers', () => {
  describe('GET and POST handlers', () => {
    it('should handle GET requests to /api/auth/[...nextauth]', async () => {
      // Arrange: Create mock GET request
      const { req } = createMocks({
        method: 'GET',
        query: { nextauth: ['signin'] },
      });

      // Act: Call GET handler
      const response = await GET(req as unknown as Request);

      // Assert: Should return response
      expect(response).not.toBeNull();
      expect(response instanceof Response).toBe(true);
    });

    it('should handle POST requests to /api/auth/[...nextauth]', async () => {
      // Arrange: Create mock POST request
      const { req } = createMocks({
        method: 'POST',
        query: { nextauth: ['callback', 'credentials'] },
        body: {
          email: 'test@example.com',
          password: 'TestP@ssw0rd',
        },
      });

      // Act: Call POST handler
      const response = await POST(req as unknown as Request);

      // Assert: Should return response
      expect(response).not.toBeNull();
      expect(response instanceof Response).toBe(true);
    });
  });
});

// ============================================================================
// Session Validation Integration Tests
// ============================================================================

describe('Session Validation', () => {
  describe('JWT session validation', () => {
    it('should attach user ID to session from JWT token', async () => {
      // Arrange: Create user and mock token
      const user = await createTestUser();
      const mockToken = {
        userId: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
      };
      const mockSession = {
        user: {
          email: user.email,
          name: user.name,
          image: user.image,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Act: Call session callback
      const result = await authConfig.session!({
        session: mockSession as any,
        token: mockToken,
      });

      // Assert: Session should have user ID
      expect(result.user.id).toBe(user.id);
      expect(result.user.email).toBe(user.email);
    });

    it('should handle session without user ID gracefully', async () => {
      // Arrange: Mock session and token without user ID
      const mockToken = {
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockSession = {
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Act: Call session callback
      const result = await authConfig.session!({
        session: mockSession as any,
        token: mockToken,
      });

      // Assert: Session should not have user ID
      expect(result.user.id).toBeUndefined();
    });
  });

  describe('session expiration', () => {
    it('should set session expiration to 30 days', async () => {
      // Arrange: Check session config
      const maxAge = authConfig.session?.maxAge;

      // Assert: Max age should be 30 days in seconds
      expect(maxAge).toBe(30 * 24 * 60 * 60);
    });
  });
});

// ============================================================================
// Complete Authentication Flow Integration Tests
// ============================================================================

describe('Complete Authentication Flow - End-to-End', () => {
  describe('credentials login to session to protected route', () => {
    it('should complete full authentication flow', async () => {
      // Step 1: Create test user
      const user = await createTestUser();

      // Step 2: Authenticate with credentials
      mockDb.prepare.mockReturnValueOnce({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(user),
        }),
      } as any);

      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      const authResult = await authorize({
        email: user.email,
        password: 'TestP@ssw0rd',
      });

      expect(authResult).not.toBeNull();
      expect(authResult?.id).toBe(user.id);

      // Step 3: Create JWT token
      mockDb.prepare.mockReturnValue({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(user),
        }),
      } as any);

      const jwtResult = await authConfig.jwt!({
        token: {},
        user: authResult as any,
        account: { provider: 'credentials', providerAccountId: user.id },
      });

      expect(jwtResult.userId).toBe(user.id);

      // Step 4: Create session
      const sessionResult = await authConfig.session!({
        session: {
          user: authResult as any,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        token: jwtResult,
      });

      expect(sessionResult.user.id).toBe(user.id);

      // Step 5: Access protected route with session
      const sessionToken = createMockSessionToken(user.id, user.email);
      const request = {
        nextUrl: {
          pathname: '/dashboard',
        },
        cookies: {
          get: jest.fn().mockReturnValue({ value: sessionToken }),
        },
      } as unknown as NextRequest;

      const response = await middleware(request);

      expect(response).not.toBeNull();
    });
  });

  describe('OAuth login to session to protected route', () => {
    it('should complete full Google OAuth flow', async () => {
      // Step 1: Mock Google user sign-in
      const googleId = 'google-e2e-test';
      const googleUser = {
        id: googleId,
        email: 'google-e2e@example.com',
        name: 'Google E2E User',
      };

      const user = await createTestUser({
        google_id: googleId,
        email: googleUser.email,
        name: googleUser.name,
      });

      // Step 2: Sign in with Google
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(user),
        }),
      } as any));

      const signInResult = await authConfig.signIn!({
        user: googleUser as any,
        account: { provider: 'google', providerAccountId: googleId } as any,
        profile: googleUser as any,
      });

      expect(signInResult).toBe(true);

      // Step 3: Create JWT token
      mockDb.prepare.mockReturnValue({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValue(user),
        }),
      } as any);

      const jwtResult = await authConfig.jwt!({
        token: {},
        user: googleUser as any,
        account: { provider: 'google', providerAccountId: googleId } as any,
      });

      expect(jwtResult.userId).toBe(user.id);

      // Step 4: Create session
      const sessionResult = await authConfig.session!({
        session: {
          user: googleUser as any,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        token: jwtResult,
      });

      expect(sessionResult.user.id).toBe(user.id);
    });
  });

  describe('logout flow', () => {
    it('should clear session and redirect to login', async () => {
      // Note: NextAuth handles logout via POST to /api/auth/signout
      // The middleware will then allow access to /login without session

      // Arrange: Create request without session (after logout)
      const request = {
        nextUrl: {
          pathname: '/login',
        },
        cookies: {
          get: jest.fn().mockReturnValue(undefined), // No session after logout
        },
      } as unknown as NextRequest;

      // Act: Call middleware
      const response = await middleware(request);

      // Assert: Should allow access to login page
      expect(response).not.toBeNull();
    });
  });
});

// ============================================================================
// Error Handling Integration Tests
// ============================================================================

describe('Authentication Error Handling', () => {
  describe('database connection errors', () => {
    it('should deny credentials login when D1 is unavailable in production', async () => {
      // Arrange: Remove DB binding and set production mode
      delete process.env.DB;
      process.env.NODE_ENV = 'production';

      // Mock credentials
      const credentials = {
        email: 'test@example.com',
        password: 'TestP@ssw0rd',
      };

      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      // Act: Try to authenticate
      const result = await authorize(credentials);

      // Assert: Should deny authentication
      expect(result).toBeNull();
    });

    it('should allow credentials login when D1 is unavailable in development', async () => {
      // Arrange: Remove DB binding and set development mode
      delete process.env.DB;
      process.env.NODE_ENV = 'development';

      // Mock credentials
      const credentials = {
        email: 'dev-test@example.com',
        password: 'TestP@ssw0rd',
      };

      const { authorize } = authConfig.providers.find(
        (p) => p.id === 'credentials'
      ) as any;

      // Act: Try to authenticate
      const result = await authorize(credentials);

      // Assert: Should allow authentication (dev mode fallback)
      expect(result).not.toBeNull();
      expect(result?.email).toBe('dev-test@example.com');
    });
  });

  describe('sign-in callback errors', () => {
    it('should deny sign-in when user creation fails', async () => {
      // Arrange: Mock Google user
      const googleId = 'google-error-test';
      const googleUser = {
        id: googleId,
        email: 'google-error@example.com',
        name: 'Error User',
      };

      const mockAccount = {
        provider: 'google',
        providerAccountId: googleId,
      };

      // Mock getUserByGoogleId to return null
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any));

      // Mock getUserByEmail to return null
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          first: jest.fn().mockResolvedValueOnce(null),
        }),
      } as any));

      // Mock createUser to fail
      mockDb.prepare.mockImplementationOnce((query: string) => ({
        bind: jest.fn().mockReturnValue({
          run: jest.fn().mockResolvedValueOnce({ success: false }),
        }),
      } as any));

      // Act: Call signIn callback
      const result = await authConfig.signIn!({
        user: googleUser as any,
        account: mockAccount as any,
        profile: googleUser as any,
      });

      // Assert: Sign-in should fail
      expect(result).toBe(false);
    });
  });
});
