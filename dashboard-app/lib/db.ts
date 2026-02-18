/**
 * Cloudflare D1 Database Access Layer
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides type-safe query functions for D1 database operations.
 * Follows Cloudflare D1 pattern: prepare() → bind() → all()/first()/run()
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Cloudflare Workers environment with D1 binding
 */
export interface Env {
  DB: D1Database;
}

/**
 * User record from database
 */
export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  image: string | null;
  google_id: string | null;
  apple_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Session record from database
 */
export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  data: string; // JSON serialized session data
  created_at: string;
}

/**
 * Call record from database (cached from Retell)
 */
export interface Call {
  id: string;
  user_id: string;
  phone_number: string;
  duration: number | null;
  status: string;
  outcome: string | null;
  transcript: string | null;
  call_date: string;
  created_at: string;
}

/**
 * Audit log record from database
 */
export interface AuditLog {
  id: number;
  user_id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Result of a database operation
 */
export interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// D1 Connection Helper
// ============================================================================

/**
 * Get D1 database instance from environment
 * This function works in both development and production
 *
 * @param env - Environment object containing D1 binding (optional in Next.js)
 * @returns D1 database instance
 *
 * @example
 * // In API routes (Edge runtime):
 * export const runtime = 'edge';
 * export async function GET(request: Request) {
 *   const db = getDb();
 *   const user = await getUserByEmail(db, 'user@example.com');
 *   return Response.json(user);
 * }
 *
 * @example
 * // In Server Components:
 * import { getDb } from '@/lib/db';
 * const db = getDb();
 * const users = await getAllUsers(db);
 */
export function getDb(env?: Env): D1Database {
  // In Next.js with @cloudflare/next-on-pages, process.env contains the D1 binding
  // In development with wrangler pages dev, the binding is also available
  if (env?.DB) {
    return env.DB;
  }

  // Access via process.env in Next.js context
  // The binding is automatically injected by Cloudflare Pages
  const envWithDb = process.env as unknown as Env;
  if (!envWithDb?.DB) {
    throw new Error(
      'D1 database binding not found. Make sure DB is bound in wrangler.toml and you are running in a Cloudflare Pages or Workers environment.'
    );
  }
  return envWithDb.DB;
}

// ============================================================================
// Generic Query Helpers
// ============================================================================

/**
 * Execute a query that returns multiple rows
 *
 * @param db - D1 database instance
 * @param query - SQL query with ? placeholders
 * @param params - Parameters to bind to placeholders
 * @returns Array of rows or error
 */
export async function queryAll<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<DbResult<T[]>> {
  try {
    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: result.results as T[],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a query that returns a single row
 *
 * @param db - D1 database instance
 * @param query - SQL query with ? placeholders
 * @param params - Parameters to bind to placeholders
 * @returns First row or null if not found
 */
export async function queryFirst<T = Record<string, unknown>>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<DbResult<T | null>> {
  try {
    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).first() : await stmt.first();

    return {
      success: true,
      data: (result as T) || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 *
 * @param db - D1 database instance
 * @param query - SQL query with ? placeholders
 * @param params - Parameters to bind to placeholders
 * @returns Success status and metadata (rows affected, last insert id)
 */
export async function queryRun(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<DbResult<{ meta: { rows: number | null; last_row_id: number | null } }>> {
  try {
    const stmt = db.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).run() : await stmt.run();

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: {
        meta: {
          rows: result.meta?.rows || null,
          last_row_id: result.meta?.last_row_id || null,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple queries in a batch transaction
 * All queries must succeed or none will be applied
 *
 * @param db - D1 database instance
 * @param queries - Array of queries with parameters
 * @returns Success status and all results
 */
export async function queryBatch(
  db: D1Database,
  queries: Array<{ sql: string; params?: unknown[] }>
): Promise<DbResult<unknown[]>> {
  try {
    const statements = queries.map((q) => {
      const stmt = db.prepare(q.sql);
      return q.params && q.params.length > 0 ? stmt.bind(...q.params) : stmt;
    });

    const results = await db.batch(statements);

    // Check if any statement had an error
    for (let i = 0; i < results.length; i++) {
      if (results[i].error) {
        return {
          success: false,
          error: `Statement ${i + 1} failed: ${results[i].error?.message}`,
        };
      }
    }

    return {
      success: true,
      data: results.map((r) => r.results),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// User Table Queries
// ============================================================================

/**
 * Get user by email address
 *
 * @param db - D1 database instance
 * @param email - User email address
 * @returns User record or null if not found
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await queryFirst<User>(db, 'SELECT * FROM users WHERE email = ?', [email]);
  return result.success ? result.data || null : null;
}

/**
 * Get user by ID
 *
 * @param db - D1 database instance
 * @param id - User ID
 * @returns User record or null if not found
 */
export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await queryFirst<User>(db, 'SELECT * FROM users WHERE id = ?', [id]);
  return result.success ? result.data || null : null;
}

/**
 * Get user by Google OAuth ID
 *
 * @param db - D1 database instance
 * @param googleId - Google OAuth user ID
 * @returns User record or null if not found
 */
export async function getUserByGoogleId(db: D1Database, googleId: string): Promise<User | null> {
  const result = await queryFirst<User>(db, 'SELECT * FROM users WHERE google_id = ?', [googleId]);
  return result.success ? result.data || null : null;
}

/**
 * Get user by Apple Sign-In ID
 *
 * @param db - D1 database instance
 * @param appleId - Apple Sign-In user ID
 * @returns User record or null if not found
 */
export async function getUserByAppleId(db: D1Database, appleId: string): Promise<User | null> {
  const result = await queryFirst<User>(db, 'SELECT * FROM users WHERE apple_id = ?', [appleId]);
  return result.success ? result.data || null : null;
}

/**
 * Get all users (use with caution - for admin purposes only)
 *
 * @param db - D1 database instance
 * @param limit - Maximum number of users to return (default: 100)
 * @param offset - Number of users to skip (default: 0)
 * @returns Array of user records
 */
export async function getAllUsers(
  db: D1Database,
  limit = 100,
  offset = 0
): Promise<DbResult<User[]>> {
  return queryAll<User>(db, 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
}

/**
 * Create a new user
 *
 * @param db - D1 database instance
 * @param userData - User data to insert
 * @returns Created user record or error
 */
export async function createUser(
  db: D1Database,
  userData: {
    id: string;
    email: string;
    password_hash?: string | null;
    name: string;
    image?: string | null;
    google_id?: string | null;
    apple_id?: string | null;
  }
): Promise<DbResult<User>> {
  const now = new Date().toISOString();
  const result = await queryRun(
    db,
    `INSERT INTO users (id, email, password_hash, name, image, google_id, apple_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userData.id,
      userData.email,
      userData.password_hash || null,
      userData.name,
      userData.image || null,
      userData.google_id || null,
      userData.apple_id || null,
      now,
      now,
    ]
  );

  if (!result.success) {
    return result as DbResult<User>;
  }

  // Fetch the created user
  const user = await getUserById(db, userData.id);
  if (!user) {
    return {
      success: false,
      error: 'Failed to retrieve created user',
    };
  }

  return {
    success: true,
    data: user,
  };
}

/**
 * Update user data
 *
 * @param db - D1 database instance
 * @param id - User ID
 * @param updates - Fields to update
 * @returns Updated user record or error
 */
export async function updateUser(
  db: D1Database,
  id: string,
  updates: Partial<Pick<User, 'name' | 'image' | 'password_hash' | 'google_id' | 'apple_id'>>
): Promise<DbResult<User>> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.image !== undefined) {
    fields.push('image = ?');
    values.push(updates.image);
  }
  if (updates.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.password_hash);
  }
  if (updates.google_id !== undefined) {
    fields.push('google_id = ?');
    values.push(updates.google_id);
  }
  if (updates.apple_id !== undefined) {
    fields.push('apple_id = ?');
    values.push(updates.apple_id);
  }

  if (fields.length === 0) {
    return {
      success: false,
      error: 'No fields to update',
    };
  }

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const result = await queryRun(db, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  if (!result.success) {
    return result as DbResult<User>;
  }

  const user = await getUserById(db, id);
  if (!user) {
    return {
      success: false,
      error: 'Failed to retrieve updated user',
    };
  }

  return {
    success: true,
    data: user,
  };
}

/**
 * Link OAuth provider to existing user
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param provider - OAuth provider ('google' or 'apple')
 * @param providerId - Provider's user ID
 * @returns Updated user record or error
 */
export async function linkOAuthProvider(
  db: D1Database,
  userId: string,
  provider: 'google' | 'apple',
  providerId: string
): Promise<DbResult<User>> {
  const field = provider === 'google' ? 'google_id' : 'apple_id';
  return updateUser(db, userId, { [field]: providerId });
}

/**
 * Delete user by ID
 *
 * @param db - D1 database instance
 * @param id - User ID
 * @returns Success status
 */
export async function deleteUser(db: D1Database, id: string): Promise<DbResult<void>> {
  return queryRun(db, 'DELETE FROM users WHERE id = ?', [id]) as unknown as DbResult<void>;
}

// ============================================================================
// Session Table Queries
// ============================================================================

/**
 * Get session by ID
 *
 * @param db - D1 database instance
 * @param sessionId - Session ID
 * @returns Session record or null if not found
 */
export async function getSession(db: D1Database, sessionId: string): Promise<Session | null> {
  const result = await queryFirst<Session>(db, 'SELECT * FROM sessions WHERE id = ?', [sessionId]);
  return result.success ? result.data || null : null;
}

/**
 * Create a new session
 *
 * @param db - D1 database instance
 * @param sessionData - Session data to insert
 * @returns Created session record or error
 */
export async function createSession(
  db: D1Database,
  sessionData: {
    id: string;
    user_id: string;
    expires_at: string;
    data: string;
  }
): Promise<DbResult<Session>> {
  const now = new Date().toISOString();
  const result = await queryRun(
    db,
    'INSERT INTO sessions (id, user_id, expires_at, data, created_at) VALUES (?, ?, ?, ?, ?)',
    [sessionData.id, sessionData.user_id, sessionData.expires_at, sessionData.data, now]
  );

  if (!result.success) {
    return result as DbResult<Session>;
  }

  const session = await getSession(db, sessionData.id);
  if (!session) {
    return {
      success: false,
      error: 'Failed to retrieve created session',
    };
  }

  return {
    success: true,
    data: session,
  };
}

/**
 * Delete expired sessions
 *
 * @param db - D1 database instance
 * @returns Number of sessions deleted
 */
export async function deleteExpiredSessions(db: D1Database): Promise<DbResult<number>> {
  const result = await queryRun(db, 'DELETE FROM sessions WHERE expires_at < ?', [new Date().toISOString()]);
  if (result.success && result.data?.meta?.rows !== null) {
    return {
      success: true,
      data: result.data.meta.rows,
    };
  }
  return result as unknown as DbResult<number>;
}

/**
 * Delete session by ID
 *
 * @param db - D1 database instance
 * @param sessionId - Session ID
 * @returns Success status
 */
export async function deleteSession(db: D1Database, sessionId: string): Promise<DbResult<void>> {
  return queryRun(db, 'DELETE FROM sessions WHERE id = ?', [sessionId]) as unknown as DbResult<void>;
}

/**
 * Delete all sessions for a user
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @returns Success status
 */
export async function deleteUserSessions(db: D1Database, userId: string): Promise<DbResult<void>> {
  return queryRun(db, 'DELETE FROM sessions WHERE user_id = ?', [userId]) as unknown as DbResult<void>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if database connection is working
 *
 * @param db - D1 database instance
 * @returns true if database is accessible
 */
export async function healthCheck(db: D1Database): Promise<boolean> {
  try {
    const result = await queryFirst<{ version: string }>(db, 'SELECT sqlite_version() as version', []);
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Get database statistics
 *
 * @param db - D1 database instance
 * @returns Object with table row counts
 */
export async function getDbStats(db: D1Database): Promise<
  DbResult<{
    users: number;
    sessions: number;
    calls: number;
    audit_logs: number;
  }>
> {
  try {
    const [users, sessions, calls, auditLogs] = await Promise.all([
      queryFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM users', []),
      queryFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM sessions', []),
      queryFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM calls', []),
      queryFirst<{ count: number }>(db, 'SELECT COUNT(*) as count FROM audit_log', []),
    ]);

    if (!users.success || !sessions.success || !calls.success || !auditLogs.success) {
      return {
        success: false,
        error: 'Failed to query database stats',
      };
    }

    return {
      success: true,
      data: {
        users: users.data?.count || 0,
        sessions: sessions.data?.count || 0,
        calls: calls.data?.count || 0,
        audit_logs: auditLogs.data?.count || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
