/**
 * Unit Tests: D1 Database Access Layer
 * UK Takeaway Phone Order Assistant Dashboard
 *
 * Tests for database CRUD operations, parameterized queries, and error handling.
 * Ensures >80% code coverage for lib/db.ts
 */

import {
  getDb,
  queryAll,
  queryFirst,
  queryRun,
  queryBatch,
  getUserByEmail,
  getUserById,
  getUserByGoogleId,
  getUserByAppleId,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  linkOAuthProvider,
  createSession,
  getSession,
  deleteSession,
  deleteUserSessions,
  deleteExpiredSessions,
  cacheCall,
  getCallById,
  getCallsByUserId,
  getCallsByDateRange,
  getCallsByStatus,
  getCallsByOutcome,
  getCallsByPhoneNumber,
  getCallMetrics,
  deleteCall,
  deleteUserCalls,
  getRecentCalls,
  logAuditEvent,
  getUserAuditLog,
  getAuditLogByDateRange,
  getAuditLogByEventType,
  deleteOldAuditLogs,
  healthCheck,
  getDbStats,
  type User,
  type Session,
  type Call,
  type AuditLog,
  type DbResult,
  type Env,
} from './db';

// ============================================================================
// Mock Setup
// ============================================================================

/**
 * Mock D1 statement with prepared query
 */
interface MockStatement {
  bind(...params: unknown[]): MockStatement;
  all(): Promise<{ results?: unknown[]; error?: { message: string } }>;
  first(): Promise<unknown>;
  run(): Promise<{
    meta?: { rows?: number | null; last_row_id?: number | null };
    error?: { message: string };
  }>;
}

/**
 * Mock D1 database
 */
interface MockD1Database {
  prepare(query: string): MockStatement;
  batch(statements: MockStatement[]): Promise<
    Array<{
      results?: unknown[];
      error?: { message: string };
    }>
  >;
}

/**
 * Create a mock statement that returns specific results
 */
function createMockStatement(result: unknown, error?: string): MockStatement {
  let boundParams: unknown[] = [];

  return {
    bind(...params: unknown[]) {
      boundParams = params;
      return this;
    },
    async all() {
      if (error) {
        return { error: { message: error } };
      }
      if (Array.isArray(result)) {
        return { results: result };
      }
      return { results: [result] };
    },
    async first() {
      if (error) {
        throw new Error(error);
      }
      return result || null;
    },
    async run() {
      if (error) {
        return { error: { message: error } };
      }
      return {
        meta: {
          rows: result ? 1 : 0,
          last_row_id: typeof result === 'object' && result !== null && 'id' in result ? (result as { id: number }).id : 1,
        },
      };
    },
  };
}

/**
 * Create a mock database with predefined responses
 */
function createMockDatabase(
  responses: Map<string, { result: unknown; error?: string }>
): MockD1Database {
  return {
    prepare(query: string) {
      const key = query.trim();
      const response = responses.get(key) || { result: null };
      return createMockStatement(response.result, response.error);
    },
    async batch(statements: MockStatement[]) {
      return Promise.all(statements.map(async () => ({ results: [] })));
    },
  };
}

/**
 * Helper to create a mock user
 */
function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    email: 'test@example.com',
    password_hash: null,
    name: 'Test User',
    image: null,
    google_id: null,
    apple_id: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper to create a mock session
 */
function createMockSession(overrides?: Partial<Session>): Session {
  return {
    id: 'session-123',
    user_id: 'user-123',
    expires_at: '2024-12-31T23:59:59.000Z',
    data: '{}',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper to create a mock call
 */
function createMockCall(overrides?: Partial<Call>): Call {
  return {
    id: 'call-123',
    user_id: 'user-123',
    phone_number: '+1234567890',
    duration: 120,
    status: 'completed',
    outcome: 'order_placed',
    transcript: 'Test transcript',
    call_date: '2024-01-01T12:00:00.000Z',
    created_at: '2024-01-01T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * Helper to create a mock audit log entry
 */
function createMockAuditLog(overrides?: Partial<AuditLog>): AuditLog {
  return {
    id: 1,
    user_id: 'user-123',
    event_type: 'login',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ============================================================================
// getDb() Tests
// ============================================================================

describe('getDb', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return DB from env parameter if provided', () => {
    const mockDb = createMockDatabase(new Map());
    const env: Env = { DB: mockDb as unknown as D1Database };

    const result = getDb(env);

    expect(result).toBe(mockDb);
  });

  it('should return DB from process.env if env parameter not provided', () => {
    const mockDb = createMockDatabase(new Map());
    process.env = { ...originalEnv, DB: mockDb as unknown as D1Database } as unknown as NodeJS.ProcessEnv;

    const result = getDb();

    expect(result).toBe(mockDb);
  });

  it('should throw error if DB binding not found', () => {
    process.env = {} as NodeJS.ProcessEnv;

    expect(() => getDb()).toThrow('D1 database binding not found');
  });
});

// ============================================================================
// queryAll() Tests
// ============================================================================

describe('queryAll', () => {
  it('should return multiple rows on successful query', async () => {
    const mockUsers = [createMockUser(), createMockUser({ id: 'user-456' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users',
          { result: mockUsers },
        ],
      ])
    );

    const result = await queryAll<User>(mockDb as unknown as D1Database, 'SELECT * FROM users');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUsers);
    expect(result.error).toBeUndefined();
  });

  it('should return empty array if no rows found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE id = ?',
          { result: [] },
        ],
      ])
    );

    const result = await queryAll<User>(mockDb as unknown as D1Database, 'SELECT * FROM users WHERE id = ?', [
      'nonexistent',
    ]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should bind parameters to query', async () => {
    const mockUsers = [createMockUser()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE email = ?',
          { result: mockUsers },
        ],
      ])
    );

    await queryAll<User>(mockDb as unknown as D1Database, 'SELECT * FROM users WHERE email = ?', [
      'test@example.com',
    ]);

    expect(result.success).toBe(true);
  });

  it('should return error on query failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INVALID SQL',
          { result: null, error: 'syntax error' },
        ],
      ])
    );

    const result = await queryAll<User>(mockDb as unknown as D1Database, 'INVALID SQL');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBe('syntax error');
  });

  it('should handle empty parameters array', async () => {
    const mockUsers = [createMockUser()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users',
          { result: mockUsers },
        ],
      ])
    );

    const result = await queryAll<User>(mockDb as unknown as D1Database, 'SELECT * FROM users', []);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUsers);
  });
});

// ============================================================================
// queryFirst() Tests
// ============================================================================

describe('queryFirst', () => {
  it('should return first row on successful query', async () => {
    const mockUser = createMockUser();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await queryFirst<User>(mockDb as unknown as D1Database, 'SELECT * FROM users WHERE id = ?', [
      'user-123',
    ]);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUser);
  });

  it('should return null if no row found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE id = ?',
          { result: null },
        ],
      ])
    );

    const result = await queryFirst<User>(mockDb as unknown as D1Database, 'SELECT * FROM users WHERE id = ?', [
      'nonexistent',
    ]);

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should bind parameters to query', async () => {
    const mockUser = createMockUser();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE email = ?',
          { result: mockUser },
        ],
      ])
    );

    await queryFirst<User>(mockDb as unknown as D1Database, 'SELECT * FROM users WHERE email = ?', [
      'test@example.com',
    ]);

    expect(result.success).toBe(true);
  });

  it('should return error on query failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INVALID SQL',
          { result: null, error: 'constraint failed' },
        ],
      ])
    );

    const result = await queryFirst<User>(mockDb as unknown as D1Database, 'INVALID SQL');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe('constraint failed');
  });
});

// ============================================================================
// queryRun() Tests
// ============================================================================

describe('queryRun', () => {
  it('should return success on successful INSERT', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
      ])
    );

    const result = await queryRun(mockDb as unknown as D1Database, 'INSERT INTO users', []);

    expect(result.success).toBe(true);
    expect(result.data?.meta?.rows).toBe(1);
    expect(result.data?.meta?.last_row_id).toBe(123);
  });

  it('should return success on successful UPDATE', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
      ])
    );

    const result = await queryRun(mockDb as unknown as D1Database, 'UPDATE users SET name = ?', ['New Name']);

    expect(result.success).toBe(true);
    expect(result.data?.meta?.rows).toBe(1);
  });

  it('should return success on successful DELETE', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM users',
          { result: { meta: { rows: 5, last_row_id: null } } },
        ],
      ])
    );

    const result = await queryRun(mockDb as unknown as D1Database, 'DELETE FROM users WHERE id = ?', [
      'user-123',
    ]);

    expect(result.success).toBe(true);
    expect(result.data?.meta?.rows).toBe(5);
  });

  it('should return error on query failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: null, error: 'NOT NULL constraint failed' },
        ],
      ])
    );

    const result = await queryRun(mockDb as unknown as D1Database, 'INSERT INTO users', []);

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT NULL constraint failed');
  });
});

// ============================================================================
// queryBatch() Tests
// ============================================================================

describe('queryBatch', () => {
  it('should execute all queries successfully', async () => {
    const mockDb = createMockDatabase(new Map());
    const queries = [
      { sql: 'INSERT INTO users', params: ['user1'] },
      { sql: 'INSERT INTO sessions', params: ['session1'] },
    ];

    const result = await queryBatch(mockDb as unknown as D1Database, queries);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('should return error if any query fails', async () => {
    const mockDb = createMockDatabase(new Map());
    const queries = [
      { sql: 'INSERT INTO users', params: ['user1'] },
      { sql: 'INVALID SQL', params: [] },
    ];

    // Mock batch to return error for second statement
    (mockDb.batch as jest.fn).mockResolvedValue([
      { results: [{ id: 1 }] },
      { error: { message: 'syntax error' } },
    ]);

    const result = await queryBatch(mockDb as unknown as D1Database, queries);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Statement 2 failed');
  });

  it('should handle empty query array', async () => {
    const mockDb = createMockDatabase(new Map());

    const result = await queryBatch(mockDb as unknown as D1Database, []);

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// User CRUD Tests
// ============================================================================

describe('getUserByEmail', () => {
  it('should return user if found', async () => {
    const mockUser = createMockUser();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE email = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await getUserByEmail(mockDb as unknown as D1Database, 'test@example.com');

    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE email = ?',
          { result: null },
        ],
      ])
    );

    const result = await getUserByEmail(mockDb as unknown as D1Database, 'nonexistent@example.com');

    expect(result).toBeNull();
  });

  it('should return null on query error', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE email = ?',
          { result: null, error: 'database error' },
        ],
      ])
    );

    const result = await getUserByEmail(mockDb as unknown as D1Database, 'test@example.com');

    expect(result).toBeNull();
  });
});

describe('getUserById', () => {
  it('should return user if found', async () => {
    const mockUser = createMockUser();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await getUserById(mockDb as unknown as D1Database, 'user-123');

    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE id = ?',
          { result: null },
        ],
      ])
    );

    const result = await getUserById(mockDb as unknown as D1Database, 'nonexistent');

    expect(result).toBeNull();
  });
});

describe('getUserByGoogleId', () => {
  it('should return user if found', async () => {
    const mockUser = createMockUser({ google_id: 'google-123' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE google_id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await getUserByGoogleId(mockDb as unknown as D1Database, 'google-123');

    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE google_id = ?',
          { result: null },
        ],
      ])
    );

    const result = await getUserByGoogleId(mockDb as unknown as D1Database, 'nonexistent-google-id');

    expect(result).toBeNull();
  });
});

describe('getUserByAppleId', () => {
  it('should return user if found', async () => {
    const mockUser = createMockUser({ apple_id: 'apple-123' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE apple_id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await getUserByAppleId(mockDb as unknown as D1Database, 'apple-123');

    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users WHERE apple_id = ?',
          { result: null },
        ],
      ])
    );

    const result = await getUserByAppleId(mockDb as unknown as D1Database, 'nonexistent-apple-id');

    expect(result).toBeNull();
  });
});

describe('getAllUsers', () => {
  it('should return array of users', async () => {
    const mockUsers = [createMockUser(), createMockUser({ id: 'user-456' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
          { result: mockUsers },
        ],
      ])
    );

    const result = await getAllUsers(mockDb as unknown as D1Database);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUsers);
  });

  it('should use default limit and offset', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
          { result: [] },
        ],
      ])
    );

    await getAllUsers(mockDb as unknown as D1Database);

    expect(result.success).toBe(true);
  });

  it('should use custom limit and offset', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
          { result: [] },
        ],
      ])
    );

    await getAllUsers(mockDb as unknown as D1Database, 50, 10);

    expect(result.success).toBe(true);
  });
});

describe('createUser', () => {
  it('should create user and return created record', async () => {
    const mockUser = createMockUser();
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockUser);
  });

  it('should create user with password hash', async () => {
    const mockUser = createMockUser({ password_hash: 'hashed-password' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed-password',
      name: 'Test User',
    });

    expect(result.success).toBe(true);
    expect(result.data?.password_hash).toBe('hashed-password');
  });

  it('should create user with Google OAuth ID', async () => {
    const mockUser = createMockUser({ google_id: 'google-123' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: mockUser },
        ],
      ])
    );

    const result = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'test@example.com',
      google_id: 'google-123',
      name: 'Test User',
    });

    expect(result.success).toBe(true);
    expect(result.data?.google_id).toBe('google-123');
  });

  it('should return error on insert failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: null, error: 'UNIQUE constraint failed: users.email' },
        ],
      ])
    );

    const result = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'existing@example.com',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('UNIQUE constraint failed');
  });

  it('should return error if created user cannot be retrieved', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO users',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: null },
        ],
      ])
    );

    const result = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to retrieve created user');
  });
});

describe('updateUser', () => {
  it('should update user name', async () => {
    const updatedUser = createMockUser({ name: 'Updated Name' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: updatedUser },
        ],
      ])
    );

    const result = await updateUser(mockDb as unknown as D1Database, 'user-123', { name: 'Updated Name' });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Updated Name');
  });

  it('should update user password hash', async () => {
    const updatedUser = createMockUser({ password_hash: 'new-hash' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: updatedUser },
        ],
      ])
    );

    const result = await updateUser(mockDb as unknown as D1Database, 'user-123', {
      password_hash: 'new-hash',
    });

    expect(result.success).toBe(true);
    expect(result.data?.password_hash).toBe('new-hash');
  });

  it('should update multiple fields', async () => {
    const updatedUser = createMockUser({ name: 'New Name', image: 'new-image.jpg' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: updatedUser },
        ],
      ])
    );

    const result = await updateUser(mockDb as unknown as D1Database, 'user-123', {
      name: 'New Name',
      image: 'new-image.jpg',
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('New Name');
    expect(result.data?.image).toBe('new-image.jpg');
  });

  it('should return error if no fields to update', async () => {
    const mockDb = createMockDatabase(new Map());

    const result = await updateUser(mockDb as unknown as D1Database, 'user-123', {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('No fields to update');
  });

  it('should return error on update failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: null, error: 'constraint failed' },
        ],
      ])
    );

    const result = await updateUser(mockDb as unknown as D1Database, 'user-123', { name: 'New Name' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('constraint failed');
  });
});

describe('deleteUser', () => {
  it('should delete user successfully', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM users WHERE id = ?',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteUser(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
  });

  it('should return error on delete failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM users WHERE id = ?',
          { result: null, error: 'foreign key constraint failed' },
        ],
      ])
    );

    const result = await deleteUser(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(false);
    expect(result.error).toBe('foreign key constraint failed');
  });
});

describe('linkOAuthProvider', () => {
  it('should link Google OAuth provider', async () => {
    const updatedUser = createMockUser({ google_id: 'google-123' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: updatedUser },
        ],
      ])
    );

    const result = await linkOAuthProvider(mockDb as unknown as D1Database, 'user-123', 'google', 'google-123');

    expect(result.success).toBe(true);
    expect(result.data?.google_id).toBe('google-123');
  });

  it('should link Apple Sign-In provider', async () => {
    const updatedUser = createMockUser({ apple_id: 'apple-123' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        [
          'SELECT * FROM users WHERE id = ?',
          { result: updatedUser },
        ],
      ])
    );

    const result = await linkOAuthProvider(mockDb as unknown as D1Database, 'user-123', 'apple', 'apple-123');

    expect(result.success).toBe(true);
    expect(result.data?.apple_id).toBe('apple-123');
  });
});

// ============================================================================
// Session Tests
// ============================================================================

describe('createSession', () => {
  it('should create session and return created record', async () => {
    const mockSession = createMockSession();
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO sessions',
          { result: { meta: { rows: 1, last_row_id: 1 } } },
        ],
        [
          'SELECT * FROM sessions WHERE id = ?',
          { result: mockSession },
        ],
      ])
    );

    const result = await createSession(mockDb as unknown as D1Database, {
      id: 'session-123',
      user_id: 'user-123',
      expires_at: '2024-12-31T23:59:59.000Z',
      data: '{}',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockSession);
  });

  it('should return error on insert failure', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO sessions',
          { result: null, error: 'NOT NULL constraint failed' },
        ],
      ])
    );

    const result = await createSession(mockDb as unknown as D1Database, {
      id: 'session-123',
      user_id: 'user-123',
      expires_at: '2024-12-31T23:59:59.000Z',
      data: '{}',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('NOT NULL constraint failed');
  });
});

describe('getSession', () => {
  it('should return session if found', async () => {
    const mockSession = createMockSession();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM sessions WHERE id = ?',
          { result: mockSession },
        ],
      ])
    );

    const result = await getSession(mockDb as unknown as D1Database, 'session-123');

    expect(result).toEqual(mockSession);
  });

  it('should return null if session not found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM sessions WHERE id = ?',
          { result: null },
        ],
      ])
    );

    const result = await getSession(mockDb as unknown as D1Database, 'nonexistent');

    expect(result).toBeNull();
  });
});

describe('deleteSession', () => {
  it('should delete session successfully', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM sessions WHERE id = ?',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteSession(mockDb as unknown as D1Database, 'session-123');

    expect(result.success).toBe(true);
  });
});

describe('deleteUserSessions', () => {
  it('should delete all user sessions', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM sessions WHERE user_id = ?',
          { result: { meta: { rows: 3, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteUserSessions(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
  });
});

describe('deleteExpiredSessions', () => {
  it('should delete expired sessions and return count', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM sessions WHERE expires_at < ?',
          { result: { meta: { rows: 5, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteExpiredSessions(mockDb as unknown as D1Database);

    expect(result.success).toBe(true);
    expect(result.data).toBe(5);
  });
});

// ============================================================================
// Call Operations Tests
// ============================================================================

describe('cacheCall', () => {
  it('should insert new call', async () => {
    const mockCall = createMockCall();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: null }, // Call doesn't exist yet
        ],
        [
          'INSERT INTO calls',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: mockCall },
        ],
      ])
    );

    const result = await cacheCall(mockDb as unknown as D1Database, {
      id: 'call-123',
      user_id: 'user-123',
      phone_number: '+1234567890',
      status: 'completed',
      outcome: 'order_placed',
      call_date: '2024-01-01T12:00:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCall);
  });

  it('should update existing call', async () => {
    const existingCall = createMockCall({ status: 'in_progress' });
    const updatedCall = createMockCall({ status: 'completed' });
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: existingCall }, // Call exists
        ],
        [
          'UPDATE calls',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: updatedCall },
        ],
      ])
    );

    const result = await cacheCall(mockDb as unknown as D1Database, {
      id: 'call-123',
      user_id: 'user-123',
      phone_number: '+1234567890',
      status: 'completed',
      outcome: 'order_placed',
      call_date: '2024-01-01T12:00:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('completed');
  });
});

describe('getCallById', () => {
  it('should return call if found', async () => {
    const mockCall = createMockCall();
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: mockCall },
        ],
      ])
    );

    const result = await getCallById(mockDb as unknown as D1Database, 'call-123');

    expect(result).toEqual(mockCall);
  });

  it('should return null if call not found', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: null },
        ],
      ])
    );

    const result = await getCallById(mockDb as unknown as D1Database, 'nonexistent');

    expect(result).toBeNull();
  });
});

describe('getCallsByUserId', () => {
  it('should return calls for user with default pagination', async () => {
    const mockCalls = [createMockCall(), createMockCall({ id: 'call-456' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getCallsByUserId(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCalls);
  });

  it('should use custom limit and offset', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: [] },
        ],
      ])
    );

    await getCallsByUserId(mockDb as unknown as D1Database, 'user-123', 50, 10);

    expect(result.success).toBe(true);
  });
});

describe('getCallsByDateRange', () => {
  it('should return calls within date range', async () => {
    const mockCalls = [createMockCall()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls WHERE',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getCallsByDateRange(
      mockDb as unknown as D1Database,
      '2024-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.000Z'
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCalls);
  });

  it('should filter by user ID if provided', async () => {
    const mockCalls = [createMockCall()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls WHERE',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getCallsByDateRange(
      mockDb as unknown as D1Database,
      '2024-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.000Z',
      'user-123'
    );

    expect(result.success).toBe(true);
  });
});

describe('getCallsByStatus', () => {
  it('should return calls with specified status', async () => {
    const mockCalls = [createMockCall({ status: 'completed' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getCallsByStatus(mockDb as unknown as D1Database, 'user-123', 'completed');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCalls);
  });
});

describe('getCallsByOutcome', () => {
  it('should return calls with specified outcome', async () => {
    const mockCalls = [createMockCall({ outcome: 'order_placed' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getCallsByOutcome(mockDb as unknown as D1Database, 'user-123', 'order_placed');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCalls);
  });
});

describe('getCallsByPhoneNumber', () => {
  it('should return calls matching phone number', async () => {
    const mockCalls = [createMockCall({ phone_number: '+1234567890' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getCallsByPhoneNumber(mockDb as unknown as D1Database, 'user-123', '1234567890');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCalls);
  });
});

describe('getCallMetrics', () => {
  it('should return call metrics for user', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT',
          { result: { total_calls: 100, completed_calls: 80, missed_calls: 15, failed_calls: 5, avg_duration: 120 } },
        ],
      ])
    );

    const result = await getCallMetrics(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data?.total_calls).toBe(100);
    expect(result.data?.completed_calls).toBe(80);
    expect(result.data?.completion_rate).toBe(80);
  });

  it('should calculate completion rate correctly', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT',
          { result: { total_calls: 50, completed_calls: 40, missed_calls: 8, failed_calls: 2, avg_duration: 90 } },
        ],
      ])
    );

    const result = await getCallMetrics(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data?.completion_rate).toBe(80); // 40/50 * 100
  });

  it('should return zero completion rate for no calls', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT',
          { result: { total_calls: 0, completed_calls: 0, missed_calls: 0, failed_calls: 0, avg_duration: null } },
        ],
      ])
    );

    const result = await getCallMetrics(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data?.completion_rate).toBe(0);
  });

  it('should filter by date range if provided', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT',
          { result: { total_calls: 25, completed_calls: 20, missed_calls: 4, failed_calls: 1, avg_duration: 100 } },
        ],
      ])
    );

    const result = await getCallMetrics(
      mockDb as unknown as D1Database,
      'user-123',
      '2024-01-01T00:00:00.000Z',
      '2024-01-31T23:59:59.000Z'
    );

    expect(result.success).toBe(true);
    expect(result.data?.total_calls).toBe(25);
  });
});

describe('deleteCall', () => {
  it('should delete call successfully', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM calls WHERE id = ?',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteCall(mockDb as unknown as D1Database, 'call-123');

    expect(result.success).toBe(true);
  });
});

describe('deleteUserCalls', () => {
  it('should delete all calls for user', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM calls WHERE user_id = ?',
          { result: { meta: { rows: 10, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteUserCalls(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
  });
});

describe('getRecentCalls', () => {
  it('should return recent calls with default count', async () => {
    const mockCalls = [createMockCall(), createMockCall({ id: 'call-456' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: mockCalls },
        ],
      ])
    );

    const result = await getRecentCalls(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockCalls);
  });

  it('should use custom count', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM calls',
          { result: [] },
        ],
      ])
    );

    await getRecentCalls(mockDb as unknown as D1Database, 'user-123', 20);

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Audit Log Tests
// ============================================================================

describe('logAuditEvent', () => {
  it('should log audit event successfully', async () => {
    const mockAuditLog = createMockAuditLog();
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO audit_log',
          { result: { meta: { rows: 1, last_row_id: 1 } } },
        ],
        [
          'SELECT * FROM audit_log WHERE id = ?',
          { result: mockAuditLog },
        ],
      ])
    );

    const result = await logAuditEvent(mockDb as unknown as D1Database, {
      user_id: 'user-123',
      event_type: 'login',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAuditLog);
  });

  it('should log event without IP and user agent', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'INSERT INTO audit_log',
          { result: { meta: { rows: 1, last_row_id: 1 } } },
        ],
        [
          'SELECT * FROM audit_log WHERE id = ?',
          { result: null },
        ],
      ])
    );

    const result = await logAuditEvent(mockDb as unknown as D1Database, {
      user_id: 'user-123',
      event_type: 'logout',
    });

    expect(result.success).toBe(true);
  });
});

describe('getUserAuditLog', () => {
  it('should return audit log for user', async () => {
    const mockAuditLogs = [createMockAuditLog(), createMockAuditLog({ id: 2, event_type: 'logout' })];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM audit_log WHERE',
          { result: mockAuditLogs },
        ],
      ])
    );

    const result = await getUserAuditLog(mockDb as unknown as D1Database, 'user-123');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAuditLogs);
  });

  it('should filter by event type if provided', async () => {
    const mockAuditLogs = [createMockAuditLog()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM audit_log WHERE',
          { result: mockAuditLogs },
        ],
      ])
    );

    const result = await getUserAuditLog(mockDb as unknown as D1Database, 'user-123', 'login');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAuditLogs);
  });
});

describe('getAuditLogByDateRange', () => {
  it('should return audit log entries within date range', async () => {
    const mockAuditLogs = [createMockAuditLog()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM audit_log WHERE',
          { result: mockAuditLogs },
        ],
      ])
    );

    const result = await getAuditLogByDateRange(
      mockDb as unknown as D1Database,
      '2024-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.000Z'
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAuditLogs);
  });

  it('should filter by user ID and event type if provided', async () => {
    const mockAuditLogs = [createMockAuditLog()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM audit_log WHERE',
          { result: mockAuditLogs },
        ],
      ])
    );

    const result = await getAuditLogByDateRange(
      mockDb as unknown as D1Database,
      '2024-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.000Z',
      'user-123',
      'login'
    );

    expect(result.success).toBe(true);
  });
});

describe('getAuditLogByEventType', () => {
  it('should return audit log entries for event type', async () => {
    const mockAuditLogs = [createMockAuditLog()];
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT * FROM audit_log',
          { result: mockAuditLogs },
        ],
      ])
    );

    const result = await getAuditLogByEventType(mockDb as unknown as D1Database, 'login');

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAuditLogs);
  });
});

describe('deleteOldAuditLogs', () => {
  it('should delete audit logs before specified date and return count', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'DELETE FROM audit_log WHERE',
          { result: { meta: { rows: 50, last_row_id: null } } },
        ],
      ])
    );

    const result = await deleteOldAuditLogs(mockDb as unknown as D1Database, 'user-123', '2023-12-31T23:59:59.000Z');

    expect(result.success).toBe(true);
    expect(result.data).toBe(50);
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('healthCheck', () => {
  it('should return true if database is accessible', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT sqlite_version()',
          { result: { version: '3.40.0' } },
        ],
      ])
    );

    const result = await healthCheck(mockDb as unknown as D1Database);

    expect(result).toBe(true);
  });

  it('should return false if database is not accessible', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          'SELECT sqlite_version()',
          { result: null, error: 'database is locked' },
        ],
      ])
    );

    const result = await healthCheck(mockDb as unknown as D1Database);

    expect(result).toBe(false);
  });
});

describe('getDbStats', () => {
  it('should return database statistics', async () => {
    const mockDb = createMockDatabase(
      new Map([
        ['SELECT COUNT(*) as count FROM users', { result: { count: 10 } }],
        ['SELECT COUNT(*) as count FROM sessions', { result: { count: 5 } }],
        ['SELECT COUNT(*) as count FROM calls', { result: { count: 100 } }],
        ['SELECT COUNT(*) as count FROM audit_log', { result: { count: 50 } }],
      ])
    );

    const result = await getDbStats(mockDb as unknown as D1Database);

    expect(result.success).toBe(true);
    expect(result.data?.users).toBe(10);
    expect(result.data?.sessions).toBe(5);
    expect(result.data?.calls).toBe(100);
    expect(result.data?.audit_logs).toBe(50);
  });

  it('should return error if any query fails', async () => {
    const mockDb = createMockDatabase(
      new Map([
        ['SELECT COUNT(*) as count FROM users', { result: { count: 10 } }],
        ['SELECT COUNT(*) as count FROM sessions', { result: null, error: 'table not found' }],
      ])
    );

    const result = await getDbStats(mockDb as unknown as D1Database);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to query database stats');
  });
});

// ============================================================================
// Integration Tests (combining multiple operations)
// ============================================================================

describe('Database Integration Tests', () => {
  it('should handle complete user lifecycle', async () => {
    const mockDb = createMockDatabase(
      new Map([
        // Insert user
        [
          'INSERT INTO users',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        // Get created user
        [
          'SELECT * FROM users WHERE id = ?',
          { result: createMockUser() },
        ],
        // Update user
        [
          'UPDATE users',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        // Get updated user
        [
          'SELECT * FROM users WHERE id = ?',
          { result: createMockUser({ name: 'Updated Name' }) },
        ],
        // Create session
        [
          'INSERT INTO sessions',
          { result: { meta: { rows: 1, last_row_id: 1 } } },
        ],
        // Get created session
        [
          'SELECT * FROM sessions WHERE id = ?',
          { result: createMockSession() },
        ],
        // Delete session
        [
          'DELETE FROM sessions WHERE id = ?',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
        // Delete user
        [
          'DELETE FROM users WHERE id = ?',
          { result: { meta: { rows: 1, last_row_id: null } } },
        ],
      ])
    );

    // Create user
    const createResult = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });
    expect(createResult.success).toBe(true);

    // Update user
    const updateResult = await updateUser(mockDb as unknown as D1Database, 'user-123', {
      name: 'Updated Name',
    });
    expect(updateResult.success).toBe(true);
    expect(updateResult.data?.name).toBe('Updated Name');

    // Create session
    const sessionResult = await createSession(mockDb as unknown as D1Database, {
      id: 'session-123',
      user_id: 'user-123',
      expires_at: '2024-12-31T23:59:59.000Z',
      data: '{}',
    });
    expect(sessionResult.success).toBe(true);

    // Delete session
    const deleteSessionResult = await deleteSession(mockDb as unknown as D1Database, 'session-123');
    expect(deleteSessionResult.success).toBe(true);

    // Delete user
    const deleteUserResult = await deleteUser(mockDb as unknown as D1Database, 'user-123');
    expect(deleteUserResult.success).toBe(true);
  });

  it('should handle call caching and retrieval workflow', async () => {
    const mockCall = createMockCall();
    const mockDb = createMockDatabase(
      new Map([
        // Check if call exists (not found)
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: null },
        ],
        // Insert new call
        [
          'INSERT INTO calls',
          { result: { meta: { rows: 1, last_row_id: 123 } } },
        ],
        // Get inserted call
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: mockCall },
        ],
        // Get call by ID
        [
          'SELECT * FROM calls WHERE id = ?',
          { result: mockCall },
        ],
        // Get calls by user ID
        [
          'SELECT * FROM calls',
          { result: [mockCall] },
        ],
        // Get call metrics
        [
          'SELECT',
          { result: { total_calls: 1, completed_calls: 1, missed_calls: 0, failed_calls: 0, avg_duration: 120 } },
        ],
      ])
    );

    // Cache call
    const cacheResult = await cacheCall(mockDb as unknown as D1Database, {
      id: 'call-123',
      user_id: 'user-123',
      phone_number: '+1234567890',
      duration: 120,
      status: 'completed',
      outcome: 'order_placed',
      call_date: '2024-01-01T12:00:00.000Z',
    });
    expect(cacheResult.success).toBe(true);

    // Get call by ID
    const getResult = await getCallById(mockDb as unknown as D1Database, 'call-123');
    expect(getResult).toEqual(mockCall);

    // Get calls by user ID
    const userCallsResult = await getCallsByUserId(mockDb as unknown as D1Database, 'user-123');
    expect(userCallsResult.success).toBe(true);
    expect(userCallsResult.data).toEqual([mockCall]);

    // Get call metrics
    const metricsResult = await getCallMetrics(mockDb as unknown as D1Database, 'user-123');
    expect(metricsResult.success).toBe(true);
    expect(metricsResult.data?.total_calls).toBe(1);
    expect(metricsResult.data?.completion_rate).toBe(100);
  });

  it('should handle audit logging workflow', async () => {
    const mockAuditLog = createMockAuditLog();
    const mockDb = createMockDatabase(
      new Map([
        // Log audit event
        [
          'INSERT INTO audit_log',
          { result: { meta: { rows: 1, last_row_id: 1 } } },
        ],
        // Get created audit log entry
        [
          'SELECT * FROM audit_log WHERE id = ?',
          { result: mockAuditLog },
        ],
        // Get user audit log
        [
          'SELECT * FROM audit_log WHERE',
          { result: [mockAuditLog] },
        ],
      ])
    );

    // Log login event
    const logResult = await logAuditEvent(mockDb as unknown as D1Database, {
      user_id: 'user-123',
      event_type: 'login',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
    });
    expect(logResult.success).toBe(true);

    // Get user audit log
    const auditLogResult = await getUserAuditLog(mockDb as unknown as D1Database, 'user-123');
    expect(auditLogResult.success).toBe(true);
    expect(auditLogResult.data).toEqual([mockAuditLog]);
  });

  it('should handle error scenarios gracefully', async () => {
    const mockDb = createMockDatabase(
      new Map([
        // Query error
        [
          'SELECT * FROM users WHERE email = ?',
          { result: null, error: 'database connection lost' },
        ],
        // Insert error (constraint violation)
        [
          'INSERT INTO users',
          { result: null, error: 'UNIQUE constraint failed: users.email' },
        ],
      ])
    );

    // Query error should return null
    const userResult = await getUserByEmail(mockDb as unknown as D1Database, 'test@example.com');
    expect(userResult).toBeNull();

    // Insert error should return error result
    const createResult = await createUser(mockDb as unknown as D1Database, {
      id: 'user-123',
      email: 'existing@example.com',
      name: 'Test User',
    });
    expect(createResult.success).toBe(false);
    expect(createResult.error).toContain('UNIQUE constraint failed');
  });

  it('should handle parameterized query security', async () => {
    const mockDb = createMockDatabase(
      new Map([
        [
          "SELECT * FROM users WHERE email = ? OR '1'='1",
          { result: null }, // SQL injection attempt should fail
        ],
      ])
    );

    // Attempt SQL injection via email parameter
    const maliciousEmail = "test@example.com' OR '1'='1";
    const result = await getUserByEmail(mockDb as unknown as D1Database, maliciousEmail);

    // Should not return any user (parameterized queries prevent injection)
    expect(result).toBeNull();
  });
});
