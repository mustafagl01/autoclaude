/**
 * Vercel Postgres (Neon) Database Access Layer
 * UK Takeaway Phone Order Assistant Dashboard
 */

import { sql } from '@vercel/postgres';

// ============================================================================
// Type Definitions
// ============================================================================

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

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  data: string;
  created_at: string;
}

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

export interface AuditLog {
  id: number;
  user_id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// User Queries
// ============================================================================

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserByEmail error:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserById error:', error);
    return null;
  }
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserByGoogleId error:', error);
    return null;
  }
}

export async function getUserByAppleId(appleId: string): Promise<User | null> {
  try {
    const { rows } = await sql<User>`SELECT * FROM users WHERE apple_id = ${appleId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getUserByAppleId error:', error);
    return null;
  }
}

export async function createUser(userData: {
  id: string;
  email: string;
  password_hash?: string | null;
  name: string;
  image?: string | null;
  google_id?: string | null;
  apple_id?: string | null;
}): Promise<DbResult<User>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<User>`
      INSERT INTO users (id, email, password_hash, name, image, google_id, apple_id, created_at, updated_at)
      VALUES (
        ${userData.id},
        ${userData.email},
        ${userData.password_hash || null},
        ${userData.name},
        ${userData.image || null},
        ${userData.google_id || null},
        ${userData.apple_id || null},
        ${now},
        ${now}
      )
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'name' | 'image' | 'password_hash' | 'google_id' | 'apple_id'>>
): Promise<DbResult<User>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<User>`
      UPDATE users SET
        name = COALESCE(${updates.name ?? null}, name),
        image = COALESCE(${updates.image ?? null}, image),
        password_hash = COALESCE(${updates.password_hash ?? null}, password_hash),
        google_id = COALESCE(${updates.google_id ?? null}, google_id),
        apple_id = COALESCE(${updates.apple_id ?? null}, apple_id),
        updated_at = ${now}
      WHERE id = ${id}
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteUser(id: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Session Queries
// ============================================================================

export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const { rows } = await sql<Session>`SELECT * FROM sessions WHERE id = ${sessionId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export async function createSession(sessionData: {
  id: string;
  user_id: string;
  expires_at: string;
  data: string;
}): Promise<DbResult<Session>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<Session>`
      INSERT INTO sessions (id, user_id, expires_at, data, created_at)
      VALUES (${sessionData.id}, ${sessionData.user_id}, ${sessionData.expires_at}, ${sessionData.data}, ${now})
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteSession(sessionId: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteUserSessions(userId: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteExpiredSessions(): Promise<DbResult<number>> {
  try {
    const result = await sql`DELETE FROM sessions WHERE expires_at < ${new Date().toISOString()}`;
    return { success: true, data: result.rowCount || 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Call Queries
// ============================================================================

export async function getCallById(callId: string): Promise<Call | null> {
  try {
    const { rows } = await sql<Call>`SELECT * FROM calls WHERE id = ${callId} LIMIT 1`;
    return rows[0] || null;
  } catch (error) {
    console.error('getCallById error:', error);
    return null;
  }
}

export async function getCallsByUserId(
  userId: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls WHERE user_id = ${userId}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByDateRange(
  userId: string,
  startDate: string,
  endDate: string,
  limit = 100,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls
      WHERE user_id = ${userId}
        AND call_date >= ${startDate}
        AND call_date <= ${endDate}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByStatus(
  userId: string,
  status: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls
      WHERE user_id = ${userId} AND status = ${status}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallsByPhoneNumber(
  userId: string,
  phoneNumber: string,
  limit = 25,
  offset = 0
): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls
      WHERE user_id = ${userId} AND phone_number LIKE ${'%' + phoneNumber + '%'}
      ORDER BY call_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getRecentCalls(userId: string, count = 10): Promise<DbResult<Call[]>> {
  try {
    const { rows } = await sql<Call>`
      SELECT * FROM calls WHERE user_id = ${userId}
      ORDER BY call_date DESC
      LIMIT ${count}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function cacheCall(callData: {
  id: string;
  user_id: string;
  phone_number: string;
  duration?: number | null;
  status: string;
  outcome?: string | null;
  transcript?: string | null;
  call_date: string;
}): Promise<DbResult<Call>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<Call>`
      INSERT INTO calls (id, user_id, phone_number, duration, status, outcome, transcript, call_date, created_at)
      VALUES (
        ${callData.id},
        ${callData.user_id},
        ${callData.phone_number},
        ${callData.duration || null},
        ${callData.status},
        ${callData.outcome || null},
        ${callData.transcript || null},
        ${callData.call_date},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        duration = EXCLUDED.duration,
        status = EXCLUDED.status,
        outcome = EXCLUDED.outcome,
        transcript = EXCLUDED.transcript,
        call_date = EXCLUDED.call_date
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getCallMetrics(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DbResult<{
  total_calls: number;
  completed_calls: number;
  missed_calls: number;
  failed_calls: number;
  avg_duration: number;
  completion_rate: number;
}>> {
  try {
    const { rows } = await sql`
      SELECT
        COUNT(*)::int as total_calls,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed_calls,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END)::int as missed_calls,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed_calls,
        COALESCE(AVG(duration), 0)::float as avg_duration
      FROM calls
      WHERE user_id = ${userId}
        AND (${startDate ?? null}::text IS NULL OR call_date >= ${startDate ?? null})
        AND (${endDate ?? null}::text IS NULL OR call_date <= ${endDate ?? null})
    `;
    const row = rows[0];
    const total = row.total_calls || 0;
    const completionRate = total > 0 ? ((row.completed_calls || 0) / total) * 100 : 0;
    return {
      success: true,
      data: {
        total_calls: total,
        completed_calls: row.completed_calls || 0,
        missed_calls: row.missed_calls || 0,
        failed_calls: row.failed_calls || 0,
        avg_duration: row.avg_duration || 0,
        completion_rate: completionRate,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteCall(callId: string): Promise<DbResult<void>> {
  try {
    await sql`DELETE FROM calls WHERE id = ${callId}`;
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Audit Log Queries
// ============================================================================

export async function logAuditEvent(auditData: {
  user_id: string;
  event_type: string;
  ip_address?: string | null;
  user_agent?: string | null;
}): Promise<DbResult<AuditLog>> {
  try {
    const now = new Date().toISOString();
    const { rows } = await sql<AuditLog>`
      INSERT INTO audit_log (user_id, event_type, ip_address, user_agent, created_at)
      VALUES (${auditData.user_id}, ${auditData.event_type}, ${auditData.ip_address || null}, ${auditData.user_agent || null}, ${now})
      RETURNING *
    `;
    return { success: true, data: rows[0] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserAuditLog(
  userId: string,
  eventType?: string,
  limit = 50,
  offset = 0
): Promise<DbResult<AuditLog[]>> {
  try {
    const { rows } = await sql<AuditLog>`
      SELECT * FROM audit_log
      WHERE user_id = ${userId}
        AND (${eventType ?? null}::text IS NULL OR event_type = ${eventType ?? null})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
