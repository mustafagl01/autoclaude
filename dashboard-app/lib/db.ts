/**
 * Cloudflare D1 Database Access Layer
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Provides type-safe query functions for D1 database operations.
 * Follows Cloudflare D1 pattern: prepare() → bind() → all()/first()/run()
 *
 * DEMO MODE: Set DEMO_MODE=true environment variable to use mock data instead of D1 database.
 * This is useful for Vercel deployment or local development without Cloudflare setup.
 */

// ============================================================================
// Mock Data for Demo Mode
// ============================================================================

/**
 * Demo mode mock users
 * These are used when DEMO_MODE=true
 */
const MOCK_USERS: User[] = [
  {
    id: 'demo-user-1',
    email: 'demo@takeaway.uk',
    password_hash: null, // OAuth-only user
    name: 'Demo Restaurant Owner',
    image: null,
    google_id: 'demo-google-id-123',
    apple_id: null,
    created_at: '2025-01-15T10:00:00.000Z',
    updated_at: '2025-01-15T10:00:00.000Z',
  },
  {
    id: 'demo-user-2',
    email: 'admin@takeaway.uk',
    password_hash: null, // Will be set by hashPassword in real scenario
    name: 'Admin User',
    image: null,
    google_id: null,
    apple_id: null,
    created_at: '2025-01-10T09:00:00.000Z',
    updated_at: '2025-01-10T09:00:00.000Z',
  },
];

/**
 * Demo mode mock calls
 * These are used when DEMO_MODE=true
 */
const MOCK_CALLS: Call[] = [
  {
    id: 'call-001',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7123 4567',
    duration: 245,
    status: 'completed',
    outcome: 'order_placed',
    transcript: 'Customer ordered chicken tikka masala, pilau rice, and naan bread. Total £18.50.',
    call_date: '2025-02-19T18:30:00.000Z',
    created_at: '2025-02-19T18:35:00.000Z',
  },
  {
    id: 'call-002',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7234 5678',
    duration: 180,
    status: 'completed',
    outcome: 'inquiry',
    transcript: 'Customer asked about opening hours and delivery areas.',
    call_date: '2025-02-19T17:15:00.000Z',
    created_at: '2025-02-19T17:18:00.000Z',
  },
  {
    id: 'call-003',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7345 6789',
    duration: null,
    status: 'missed',
    outcome: null,
    transcript: null,
    call_date: '2025-02-19T16:45:00.000Z',
    created_at: '2025-02-19T16:45:00.000Z',
  },
  {
    id: 'call-004',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7456 7890',
    duration: 320,
    status: 'completed',
    outcome: 'order_placed',
    transcript: 'Customer ordered lamb rogan josh, onion bhajis, and two garlic naans. Total £24.00.',
    call_date: '2025-02-18T19:20:00.000Z',
    created_at: '2025-02-18T19:25:00.000Z',
  },
  {
    id: 'call-005',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7567 8901',
    duration: 95,
    status: 'failed',
    outcome: 'technical_issue',
    transcript: 'Call disconnected due to poor signal quality.',
    call_date: '2025-02-18T14:30:00.000Z',
    created_at: '2025-02-18T14:31:00.000Z',
  },
  {
    id: 'call-006',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7678 9012',
    duration: 410,
    status: 'completed',
    outcome: 'complaint',
    transcript: 'Customer reported cold food delivery and requested refund for £22.50 order.',
    call_date: '2025-02-17T21:00:00.000Z',
    created_at: '2025-02-17T21:07:00.000Z',
  },
  {
    id: 'call-007',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7789 0123',
    duration: 195,
    status: 'completed',
    outcome: 'order_placed',
    transcript: 'Customer ordered vegetable biryani, samosas, and mango chutney. Total £15.00.',
    call_date: '2025-02-17T18:00:00.000Z',
    created_at: '2025-02-17T18:03:00.000Z',
  },
  {
    id: 'call-008',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7890 1234',
    duration: null,
    status: 'missed',
    outcome: null,
    transcript: null,
    call_date: '2025-02-17T12:30:00.000Z',
    created_at: '2025-02-17T12:30:00.000Z',
  },
  {
    id: 'call-009',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7901 2345',
    duration: 275,
    status: 'completed',
    outcome: 'order_placed',
    transcript: 'Customer ordered mixed grill for two with extra naans. Total £35.00.',
    call_date: '2025-02-16T20:15:00.000Z',
    created_at: '2025-02-16T20:20:00.000Z',
  },
  {
    id: 'call-010',
    user_id: 'demo-user-1',
    phone_number: '+44 20 7012 3456',
    duration: 150,
    status: 'completed',
    outcome: 'inquiry',
    transcript: 'Customer asked about vegetarian options and allergen information.',
    call_date: '2025-02-16T15:45:00.000Z',
    created_at: '2025-02-16T15:48:00.000Z',
  },
];

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
 * Mock D1 Database for Demo Mode
 * Provides an in-memory database that mimics Cloudflare D1 behavior
 * Used when DEMO_MODE=true environment variable is set
 */
class MockD1Database implements D1Database {
  private users: User[] = [...MOCK_USERS];
  private calls: Call[] = [...MOCK_CALLS];
  private sessions: Session[] = [];
  private auditLogs: AuditLog[] = [];

  prepare(query: string): MockD1Statement {
    return new MockD1Statement(query, this);
  }

  // Internal methods for MockD1Statement to access
  getUsers(): User[] {
    return this.users;
  }

  getCalls(): Call[] {
    return this.calls;
  }

  getSessions(): Session[] {
    return this.sessions;
  }

  getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  addUser(user: User): void {
    this.users.push(user);
  }

  addCall(call: Call): void {
    this.calls.push(call);
  }

  addSession(session: Session): void {
    this.sessions.push(session);
  }

  addAuditLog(log: AuditLog): void {
    this.auditLogs.push(log);
  }

  updateUser(id: string, updates: Partial<User>): void {
    const index = this.users.findIndex((u) => u.id === id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updates, updated_at: new Date().toISOString() };
    }
  }

  deleteUser(id: string): void {
    this.users = this.users.filter((u) => u.id !== id);
  }

  deleteCall(id: string): void {
    this.calls = this.calls.filter((c) => c.id !== id);
  }

  deleteSession(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id);
  }

  deleteSessionsBefore(date: string): void {
    this.sessions = this.sessions.filter((s) => s.expires_at >= date);
  }

  deleteOldAuditLogs(userId: string, beforeDate: string): void {
    this.auditLogs = this.auditLogs.filter((log) => !(log.user_id === userId && log.created_at < beforeDate));
  }

  batch(statements: MockD1Statement[]): Promise<D1Result[]> {
    return Promise.all(statements.map((stmt) => stmt.run()));
  }
}

/**
 * Mock D1 Statement for Demo Mode
 * Implements the D1Statement interface for query execution
 */
class MockD1Statement implements D1Statement {
  private query: string;
  private db: MockD1Database;
  private params: unknown[] = [];

  constructor(query: string, db: MockD1Database) {
    this.query = query;
    this.db = db;
  }

  bind(...params: unknown[]): this {
    this.params = params;
    return this;
  }

  async all(): Promise<D1Result> {
    const results = this.executeSelect();
    return {
      results,
      success: true,
      statement: this.query,
    };
  }

  async first(): Promise<D1Result | null> {
    const results = this.executeSelect();
    return {
      results: results[0] || null,
      success: true,
      statement: this.query,
    };
  }

  async run(): Promise<D1Result> {
    const meta = this.executeUpdate();
    return {
      results: null,
      success: true,
      statement: this.query,
      meta,
    };
  }

  private executeSelect(): Record<string, unknown>[] {
    const lowerQuery = this.query.toLowerCase();

    // SELECT queries
    if (lowerQuery.includes('select')) {
      // User queries
      if (lowerQuery.includes('from users')) {
        return this.handleUserSelect();
      }

      // Call queries
      if (lowerQuery.includes('from calls')) {
        return this.handleCallSelect();
      }

      // Session queries
      if (lowerQuery.includes('from sessions')) {
        return this.handleSessionSelect();
      }

      // Audit log queries
      if (lowerQuery.includes('from audit_log')) {
        return this.handleAuditLogSelect();
      }

      // Aggregate functions
      if (lowerQuery.includes('count(') || lowerQuery.includes('sum(') || lowerQuery.includes('avg(')) {
        return this.handleAggregateSelect();
      }

      // SQLite version query
      if (lowerQuery.includes('sqlite_version()')) {
        return [{ version: '3.40.0' }];
      }
    }

    return [];
  }

  private handleUserSelect(): Record<string, unknown>[] {
    const users = this.db.getUsers();

    // Filter by email
    if (this.query.includes('email = ?')) {
      const email = this.params[0] as string;
      return users.filter((u) => u.email === email).map((u) => ({ ...u }));
    }

    // Filter by ID
    if (this.query.includes('id = ?')) {
      const id = this.params[0] as string;
      return users.filter((u) => u.id === id).map((u) => ({ ...u }));
    }

    // Filter by Google ID
    if (this.query.includes('google_id = ?')) {
      const googleId = this.params[0] as string;
      return users.filter((u) => u.google_id === googleId).map((u) => ({ ...u }));
    }

    // Filter by Apple ID
    if (this.query.includes('apple_id = ?')) {
      const appleId = this.params[0] as string;
      return users.filter((u) => u.apple_id === appleId).map((u) => ({ ...u }));
    }

    // Get all users with limit/offset
    const limit = this.params[0] as number || 100;
    const offset = this.params[1] as number || 0;
    return users
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(offset, offset + limit)
      .map((u) => ({ ...u }));
  }

  private handleCallSelect(): Record<string, unknown>[] {
    const calls = this.db.getCalls();
    let filteredCalls = [...calls];

    // Filter by user ID
    if (this.query.includes('user_id = ?')) {
      const userIdIndex = this.params.findIndex((p) => typeof p === 'string' && p.startsWith('demo-user'));
      if (userIdIndex !== -1) {
        const userId = this.params[userIdIndex] as string;
        filteredCalls = filteredCalls.filter((c) => c.user_id === userId);
      }
    }

    // Filter by ID
    if (this.query.includes('id = ?') && !this.query.includes('user_id')) {
      const id = this.params[0] as string;
      return calls.filter((c) => c.id === id).map((c) => ({ ...c }));
    }

    // Filter by status
    if (this.query.includes('status = ?')) {
      const status = this.params[this.params.length - 3] as string;
      filteredCalls = filteredCalls.filter((c) => c.status === status);
    }

    // Filter by outcome
    if (this.query.includes('outcome = ?')) {
      const outcome = this.params[this.params.length - 3] as string;
      filteredCalls = filteredCalls.filter((c) => c.outcome === outcome);
    }

    // Filter by phone number (LIKE)
    if (this.query.includes('phone_number LIKE ?')) {
      const phoneNumber = this.params[this.params.length - 3] as string;
      const searchTerm = phoneNumber.replace(/%/g, '');
      filteredCalls = filteredCalls.filter((c) => c.phone_number.includes(searchTerm));
    }

    // Filter by date range
    if (this.query.includes('call_date >= ? AND call_date <= ?')) {
      const startDate = this.params[1] as string;
      const endDate = this.params[2] as string;
      filteredCalls = filteredCalls.filter(
        (c) => c.call_date >= startDate && c.call_date <= endDate
      );
    }

    // Sort by call_date DESC
    filteredCalls.sort((a, b) => b.call_date.localeCompare(a.call_date));

    // Apply limit and offset
    const limit = this.params[this.params.length - 2] as number || 25;
    const offset = this.params[this.params.length - 1] as number || 0;
    return filteredCalls.slice(offset, offset + limit).map((c) => ({ ...c }));
  }

  private handleSessionSelect(): Record<string, unknown>[] {
    const sessions = this.db.getSessions();

    // Filter by ID
    if (this.query.includes('id = ?')) {
      const id = this.params[0] as string;
      return sessions.filter((s) => s.id === id).map((s) => ({ ...s }));
    }

    return sessions.map((s) => ({ ...s }));
  }

  private handleAuditLogSelect(): Record<string, unknown>[] {
    const auditLogs = this.db.getAuditLogs();
    let filteredLogs = [...auditLogs];

    // Filter by user ID
    if (this.query.includes('user_id = ?')) {
      const userId = this.params[0] as string;
      filteredLogs = filteredLogs.filter((log) => log.user_id === userId);
    }

    // Filter by event type
    if (this.query.includes('event_type = ?')) {
      const eventType = this.params[this.params.length - 3] as string;
      filteredLogs = filteredLogs.filter((log) => log.event_type === eventType);
    }

    // Filter by date range
    if (this.query.includes('created_at >= ? AND created_at <= ?')) {
      const startDate = this.params[1] as string;
      const endDate = this.params[2] as string;
      filteredLogs = filteredLogs.filter(
        (log) => log.created_at >= startDate && log.created_at <= endDate
      );
    }

    // Sort by created_at DESC
    filteredLogs.sort((a, b) => b.created_at.localeCompare(a.created_at));

    // Apply limit and offset
    const limit = this.params[this.params.length - 2] as number || 50;
    const offset = this.params[this.params.length - 1] as number || 0;
    return filteredLogs.slice(offset, offset + limit).map((log) => ({ ...log }));
  }

  private handleAggregateSelect(): Record<string, unknown>[] {
    const calls = this.db.getCalls();

    // Call metrics query
    if (this.query.includes('from calls') && this.query.includes('user_id = ?')) {
      const userId = this.params[0] as string;
      const userCalls = calls.filter((c) => c.user_id === userId);

      const total = userCalls.length;
      const completed = userCalls.filter((c) => c.status === 'completed').length;
      const missed = userCalls.filter((c) => c.status === 'missed').length;
      const failed = userCalls.filter((c) => c.status === 'failed').length;
      const completedWithDuration = userCalls.filter(
        (c) => c.status === 'completed' && c.duration !== null
      );
      const avgDuration =
        completedWithDuration.length > 0
          ? completedWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) /
            completedWithDuration.length
          : 0;

      return [
        {
          total_calls: total,
          completed_calls: completed,
          missed_calls: missed,
          failed_calls: failed,
          avg_duration: avgDuration,
        },
      ];
    }

    // Count queries
    if (this.query.includes('count(*)')) {
      if (this.query.includes('from users')) {
        return [{ count: this.db.getUsers().length }];
      }
      if (this.query.includes('from sessions')) {
        return [{ count: this.db.getSessions().length }];
      }
      if (this.query.includes('from calls')) {
        return [{ count: this.db.getCalls().length }];
      }
      if (this.query.includes('from audit_log')) {
        return [{ count: this.db.getAuditLogs().length }];
      }
    }

    return [];
  }

  private executeUpdate(): { rows: number | null; last_row_id: number | null } {
    const lowerQuery = this.query.toLowerCase();

    // INSERT operations
    if (lowerQuery.startsWith('insert into users')) {
      const user: User = {
        id: this.params[0] as string,
        email: this.params[1] as string,
        password_hash: this.params[2] as string | null,
        name: this.params[3] as string,
        image: this.params[4] as string | null,
        google_id: this.params[5] as string | null,
        apple_id: this.params[6] as string | null,
        created_at: this.params[7] as string,
        updated_at: this.params[8] as string,
      };
      this.db.addUser(user);
      return { rows: 1, last_row_id: parseInt(user.id.slice(-1)) };
    }

    if (lowerQuery.startsWith('insert into sessions')) {
      const session: Session = {
        id: this.params[0] as string,
        user_id: this.params[1] as string,
        expires_at: this.params[2] as string,
        data: this.params[3] as string,
        created_at: this.params[4] as string,
      };
      this.db.addSession(session);
      return { rows: 1, last_row_id: 1 };
    }

    if (lowerQuery.startsWith('insert into calls')) {
      const call: Call = {
        id: this.params[0] as string,
        user_id: this.params[1] as string,
        phone_number: this.params[2] as string,
        duration: this.params[3] as number | null,
        status: this.params[4] as string,
        outcome: this.params[5] as string | null,
        transcript: this.params[6] as string | null,
        call_date: this.params[7] as string,
        created_at: this.params[8] as string,
      };
      this.db.addCall(call);
      return { rows: 1, last_row_id: 1 };
    }

    if (lowerQuery.startsWith('insert into audit_log')) {
      const auditLog: AuditLog = {
        id: this.db.getAuditLogs().length + 1,
        user_id: this.params[0] as string,
        event_type: this.params[1] as string,
        ip_address: this.params[2] as string | null,
        user_agent: this.params[3] as string | null,
        created_at: this.params[4] as string,
      };
      this.db.addAuditLog(auditLog);
      return { rows: 1, last_row_id: auditLog.id };
    }

    // UPDATE operations
    if (lowerQuery.startsWith('update users')) {
      const id = this.params[this.params.length - 1] as string;
      const updates: Partial<User> = {};

      if (this.query.includes('name = ?')) {
        let paramIndex = 0;
        if (this.query.includes('name = ?') && this.query.includes('image = ?')) {
          updates.name = this.params[paramIndex++] as string;
          updates.image = this.params[paramIndex++] as string | null;
        } else {
          updates.name = this.params[0] as string;
        }
      }
      if (this.query.includes('image = ?') && !updates.image) {
        updates.image = this.params[0] as string | null;
      }
      if (this.query.includes('password_hash = ?')) {
        updates.password_hash = this.params[0] as string | null;
      }
      if (this.query.includes('google_id = ?')) {
        updates.google_id = this.params[0] as string | null;
      }
      if (this.query.includes('apple_id = ?')) {
        updates.apple_id = this.params[0] as string | null;
      }

      this.db.updateUser(id, updates);
      return { rows: 1, last_row_id: null };
    }

    if (lowerQuery.startsWith('update calls')) {
      const id = this.params[this.params.length - 1] as string;
      const calls = this.db.getCalls();
      const index = calls.findIndex((c) => c.id === id);
      if (index !== -1) {
        calls[index] = {
          ...calls[index],
          phone_number: this.params[0] as string,
          duration: this.params[1] as number | null,
          status: this.params[2] as string,
          outcome: this.params[3] as string | null,
          transcript: this.params[4] as string | null,
          call_date: this.params[5] as string,
        };
      }
      return { rows: 1, last_row_id: null };
    }

    // DELETE operations
    if (lowerQuery.startsWith('delete from users')) {
      const id = this.params[0] as string;
      this.db.deleteUser(id);
      return { rows: 1, last_row_id: null };
    }

    if (lowerQuery.startsWith('delete from sessions')) {
      if (this.query.includes('id = ?')) {
        const id = this.params[0] as string;
        this.db.deleteSession(id);
      } else if (this.query.includes('user_id = ?')) {
        const userId = this.params[0] as string;
        const sessions = this.db.getSessions().filter((s) => s.user_id !== userId);
        // Update sessions in db (hacky but works for mock)
        (this.db as any).sessions = sessions;
      } else if (this.query.includes('expires_at < ?')) {
        const date = this.params[0] as string;
        this.db.deleteSessionsBefore(date);
      }
      return { rows: 1, last_row_id: null };
    }

    if (lowerQuery.startsWith('delete from calls')) {
      if (this.query.includes('id = ?')) {
        const id = this.params[0] as string;
        this.db.deleteCall(id);
      } else if (this.query.includes('user_id = ?')) {
        const userId = this.params[0] as string;
        const calls = this.db.getCalls().filter((c) => c.user_id !== userId);
        (this.db as any).calls = calls;
      }
      return { rows: 1, last_row_id: null };
    }

    if (lowerQuery.startsWith('delete from audit_log')) {
      const userId = this.params[0] as string;
      const beforeDate = this.params[1] as string;
      this.db.deleteOldAuditLogs(userId, beforeDate);
      return { rows: 1, last_row_id: null };
    }

    return { rows: 0, last_row_id: null };
  }
}

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
  // Check if demo mode is enabled
  if (process.env.DEMO_MODE === 'true') {
    // Return a singleton instance of the mock database
    if (!(globalThis as any).__mockDbInstance) {
      (globalThis as any).__mockDbInstance = new MockD1Database();
      console.log('[Demo Mode] Mock database initialized with sample data');
    }
    return (globalThis as any).__mockDbInstance;
  }

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
      'D1 database binding not found. Make sure DB is bound in wrangler.toml and you are running in a Cloudflare Pages or Workers environment.\n\n' +
      'To enable demo mode (for Vercel or local development), set DEMO_MODE=true in your environment.'
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
// Call Table Queries (Cached from Retell AI)
// ============================================================================

/**
 * Cache call data from Retell AI to local database
 *
 * @param db - D1 database instance
 * @param callData - Call data from Retell API
 * @returns Created call record or error
 */
export async function cacheCall(
  db: D1Database,
  callData: {
    id: string;
    user_id: string;
    phone_number: string;
    duration?: number | null;
    status: string;
    outcome?: string | null;
    transcript?: string | null;
    call_date: string;
  }
): Promise<DbResult<Call>> {
  const now = new Date().toISOString();

  // Check if call already exists (upsert logic)
  const existing = await getCallById(db, callData.id);

  if (existing) {
    // Update existing call
    const result = await queryRun(
      db,
      `UPDATE calls
       SET phone_number = ?, duration = ?, status = ?, outcome = ?, transcript = ?, call_date = ?
       WHERE id = ?`,
      [
        callData.phone_number,
        callData.duration || null,
        callData.status,
        callData.outcome || null,
        callData.transcript || null,
        callData.call_date,
        callData.id,
      ]
    );

    if (!result.success) {
      return result as unknown as DbResult<Call>;
    }

    const updated = await getCallById(db, callData.id);
    if (!updated) {
      return {
        success: false,
        error: 'Failed to retrieve updated call',
      };
    }

    return {
      success: true,
      data: updated,
    };
  }

  // Insert new call
  const result = await queryRun(
    db,
    `INSERT INTO calls (id, user_id, phone_number, duration, status, outcome, transcript, call_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      callData.id,
      callData.user_id,
      callData.phone_number,
      callData.duration || null,
      callData.status,
      callData.outcome || null,
      callData.transcript || null,
      callData.call_date,
      now,
    ]
  );

  if (!result.success) {
    return result as unknown as DbResult<Call>;
  }

  const call = await getCallById(db, callData.id);
  if (!call) {
    return {
      success: false,
      error: 'Failed to retrieve cached call',
    };
  }

  return {
    success: true,
    data: call,
  };
}

/**
 * Get call by ID
 *
 * @param db - D1 database instance
 * @param callId - Call ID from Retell
 * @returns Call record or null if not found
 */
export async function getCallById(db: D1Database, callId: string): Promise<Call | null> {
  const result = await queryFirst<Call>(db, 'SELECT * FROM calls WHERE id = ?', [callId]);
  return result.success ? result.data || null : null;
}

/**
 * Get calls by user ID with pagination
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param limit - Maximum number of calls to return (default: 25)
 * @param offset - Number of calls to skip (default: 0)
 * @returns Array of call records
 */
export async function getCallsByUserId(
  db: D1Database,
  userId: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  return queryAll<Call>(
    db,
    `SELECT * FROM calls
     WHERE user_id = ?
     ORDER BY call_date DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
}

/**
 * Get calls by date range with optional user filter
 *
 * @param db - D1 database instance
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @param userId - Optional user ID to filter by
 * @param limit - Maximum number of calls to return (default: 100)
 * @param offset - Number of calls to skip (default: 0)
 * @returns Array of call records within date range
 */
export async function getCallsByDateRange(
  db: D1Database,
  startDate: string,
  endDate: string,
  userId?: string,
  limit = 100,
  offset = 0
): Promise<DbResult<Call[]>> {
  let query = `SELECT * FROM calls WHERE call_date >= ? AND call_date <= ?`;
  const params: unknown[] = [startDate, endDate];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY call_date DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return queryAll<Call>(db, query, params);
}

/**
 * Get calls by status
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param status - Call status (e.g., 'completed', 'missed', 'failed')
 * @param limit - Maximum number of calls to return (default: 25)
 * @param offset - Number of calls to skip (default: 0)
 * @returns Array of call records with specified status
 */
export async function getCallsByStatus(
  db: D1Database,
  userId: string,
  status: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  return queryAll<Call>(
    db,
    `SELECT * FROM calls
     WHERE user_id = ? AND status = ?
     ORDER BY call_date DESC
     LIMIT ? OFFSET ?`,
    [userId, status, limit, offset]
  );
}

/**
 * Get calls by outcome
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param outcome - Call outcome (e.g., 'order_placed', 'inquiry', 'complaint')
 * @param limit - Maximum number of calls to return (default: 25)
 * @param offset - Number of calls to skip (default: 0)
 * @returns Array of call records with specified outcome
 */
export async function getCallsByOutcome(
  db: D1Database,
  userId: string,
  outcome: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  return queryAll<Call>(
    db,
    `SELECT * FROM calls
     WHERE user_id = ? AND outcome = ?
     ORDER BY call_date DESC
     LIMIT ? OFFSET ?`,
    [userId, outcome, limit, offset]
  );
}

/**
 * Get calls by phone number
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param phoneNumber - Phone number to search for
 * @param limit - Maximum number of calls to return (default: 25)
 * @param offset - Number of calls to skip (default: 0)
 * @returns Array of call records matching phone number
 */
export async function getCallsByPhoneNumber(
  db: D1Database,
  userId: string,
  phoneNumber: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  return queryAll<Call>(
    db,
    `SELECT * FROM calls
     WHERE user_id = ? AND phone_number LIKE ?
     ORDER BY call_date DESC
     LIMIT ? OFFSET ?`,
    [userId, `%${phoneNumber}%`, limit, offset]
  );
}

/**
 * Get call metrics for a user
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param startDate - Optional start date for filtering (ISO string)
 * @param endDate - Optional end date for filtering (ISO string)
 * @returns Object with call metrics (total, completed, avg duration)
 */
export async function getCallMetrics(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<
  DbResult<{
    total_calls: number;
    completed_calls: number;
    missed_calls: number;
    failed_calls: number;
    avg_duration: number;
    completion_rate: number;
  }>
> {
  try {
    let dateFilter = '';
    const params: unknown[] = [userId];

    if (startDate && endDate) {
      dateFilter = 'AND call_date >= ? AND call_date <= ?';
      params.push(startDate, endDate);
    }

    const query = `
      SELECT
        COUNT(*) as total_calls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed_calls,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
        AVG(duration) as avg_duration
      FROM calls
      WHERE user_id = ? ${dateFilter}
    `;

    const result = await queryFirst<{
      total_calls: number;
      completed_calls: number;
      missed_calls: number;
      failed_calls: number;
      avg_duration: number;
    }>(db, query, params);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'Failed to query call metrics',
      };
    }

    const total = result.data.total_calls || 0;
    const completionRate = total > 0 ? ((result.data.completed_calls || 0) / total) * 100 : 0;

    return {
      success: true,
      data: {
        total_calls: total,
        completed_calls: result.data.completed_calls || 0,
        missed_calls: result.data.missed_calls || 0,
        failed_calls: result.data.failed_calls || 0,
        avg_duration: result.data.avg_duration || 0,
        completion_rate: completionRate,
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
 * Delete cached call by ID
 *
 * @param db - D1 database instance
 * @param callId - Call ID to delete
 * @returns Success status
 */
export async function deleteCall(db: D1Database, callId: string): Promise<DbResult<void>> {
  return queryRun(db, 'DELETE FROM calls WHERE id = ?', [callId]) as unknown as DbResult<void>;
}

/**
 * Delete all cached calls for a user
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @returns Success status
 */
export async function deleteUserCalls(db: D1Database, userId: string): Promise<DbResult<void>> {
  return queryRun(db, 'DELETE FROM calls WHERE user_id = ?', [userId]) as unknown as DbResult<void>;
}

/**
 * Get recent calls for a user (last N calls)
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param count - Number of recent calls to return (default: 10)
 * @returns Array of most recent call records
 */
export async function getRecentCalls(
  db: D1Database,
  userId: string,
  count = 10
): Promise<DbResult<Call[]>> {
  return queryAll<Call>(
    db,
    `SELECT * FROM calls
     WHERE user_id = ?
     ORDER BY call_date DESC
     LIMIT ?`,
    [userId, count]
  );
}

// ============================================================================
// Audit Log Queries
// ============================================================================

/**
 * Log a security event for a user
 *
 * @param db - D1 database instance
 * @param auditData - Audit event data
 * @returns Created audit log record or error
 *
 * @example
 * // Log login event
 * await logAuditEvent(db, {
 *   user_id: 'user123',
 *   event_type: 'login',
 *   ip_address: '192.168.1.1',
 *   user_agent: 'Mozilla/5.0...'
 * });
 */
export async function logAuditEvent(
  db: D1Database,
  auditData: {
    user_id: string;
    event_type: string;
    ip_address?: string | null;
    user_agent?: string | null;
  }
): Promise<DbResult<AuditLog>> {
  const now = new Date().toISOString();
  const result = await queryRun(
    db,
    'INSERT INTO audit_log (user_id, event_type, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?)',
    [auditData.user_id, auditData.event_type, auditData.ip_address || null, auditData.user_agent || null, now]
  );

  if (!result.success) {
    return result as unknown as DbResult<AuditLog>;
  }

  // Fetch the created audit log entry using the last insert ID
  if (result.data?.meta?.last_row_id) {
    const auditEntry = await queryFirst<AuditLog>(db, 'SELECT * FROM audit_log WHERE id = ?', [
      result.data.meta.last_row_id,
    ]);

    if (auditEntry.success && auditEntry.data) {
      return {
        success: true,
        data: auditEntry.data,
      };
    }
  }

  // If we can't retrieve the created entry, still return success
  return {
    success: true,
    data: undefined,
  };
}

/**
 * Get audit log for a specific user with pagination
 *
 * @param db - D1 database instance
 * @param userId - User ID to get audit log for
 * @param eventType - Optional event type to filter by (e.g., 'login', 'logout', 'password_change')
 * @param limit - Maximum number of audit entries to return (default: 50)
 * @param offset - Number of audit entries to skip (default: 0)
 * @returns Array of audit log entries for the user
 *
 * @example
 * // Get recent login events for a user
 * const logs = await getUserAuditLog(db, 'user123', 'login', 10, 0);
 */
export async function getUserAuditLog(
  db: D1Database,
  userId: string,
  eventType?: string,
  limit = 50,
  offset = 0
): Promise<DbResult<AuditLog[]>> {
  let query = 'SELECT * FROM audit_log WHERE user_id = ?';
  const params: unknown[] = [userId];

  if (eventType) {
    query += ' AND event_type = ?';
    params.push(eventType);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return queryAll<AuditLog>(db, query, params);
}

/**
 * Get audit log entries by date range
 *
 * @param db - D1 database instance
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 * @param userId - Optional user ID to filter by
 * @param eventType - Optional event type to filter by
 * @param limit - Maximum number of audit entries to return (default: 100)
 * @param offset - Number of audit entries to skip (default: 0)
 * @returns Array of audit log entries within date range
 */
export async function getAuditLogByDateRange(
  db: D1Database,
  startDate: string,
  endDate: string,
  userId?: string,
  eventType?: string,
  limit = 100,
  offset = 0
): Promise<DbResult<AuditLog[]>> {
  let query = 'SELECT * FROM audit_log WHERE created_at >= ? AND created_at <= ?';
  const params: unknown[] = [startDate, endDate];

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  if (eventType) {
    query += ' AND event_type = ?';
    params.push(eventType);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return queryAll<AuditLog>(db, query, params);
}

/**
 * Get audit log entries by event type
 *
 * @param db - D1 database instance
 * @param eventType - Event type to filter by (e.g., 'login', 'logout', 'password_change')
 * @param limit - Maximum number of audit entries to return (default: 50)
 * @param offset - Number of audit entries to skip (default: 0)
 * @returns Array of audit log entries with the specified event type
 */
export async function getAuditLogByEventType(
  db: D1Database,
  eventType: string,
  limit = 50,
  offset = 0
): Promise<DbResult<AuditLog[]>> {
  return queryAll<AuditLog>(
    db,
    `SELECT * FROM audit_log
     WHERE event_type = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [eventType, limit, offset]
  );
}

/**
 * Delete audit log entries for a user before a specific date
 * Useful for cleaning up old audit logs while retaining recent ones
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param beforeDate - Delete entries before this date (ISO string)
 * @returns Number of audit log entries deleted
 */
export async function deleteOldAuditLogs(
  db: D1Database,
  userId: string,
  beforeDate: string
): Promise<DbResult<number>> {
  const result = await queryRun(
    db,
    'DELETE FROM audit_log WHERE user_id = ? AND created_at < ?',
    [userId, beforeDate]
  );

  if (result.success && result.data?.meta?.rows !== null) {
    return {
      success: true,
      data: result.data.meta.rows,
    };
  }

  return result as unknown as DbResult<number>;
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
