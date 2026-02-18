# Security Audit Report
## Authentication Code & OAuth Token Handling
**Date:** 2026-02-18
**Audited by:** Claude Code (Auto-Claude)
**Scope:** NextAuth configuration, OAuth providers, password handling, database queries

---

## Executive Summary

This security audit reviewed the authentication implementation for the UK Takeaway Phone Order Assistant Dashboard. The review covered:
- NextAuth.js configuration (route.ts)
- Password hashing and verification (auth.ts)
- Database query security (db.ts)
- Environment configuration

**Overall Assessment:** ⚠️ **MODERATE RISK**

The authentication system follows many security best practices but contains **3 HIGH-RISK** and **5 MEDIUM-RISK** issues that should be addressed before production deployment.

---

## Security Findings

### 🔴 HIGH RISK ISSUES

#### 1. Development Mode Bypass in Production
**Location:** `app/api/auth/[...nextauth]/route.ts:146-151` and `268-271`
**Severity:** HIGH
**CWE:** CWE-1188 (Insecure Default Initialization of Resource)

**Issue:**
```typescript
// Lines 146-151
if (process.env.NODE_ENV === 'production') {
  return null;
}
// For development without D1, allow sign-in with any credentials
// Remove this in production!
return {
  id: 'dev-user-id',
  email: credentials.email as string,
  name: 'Dev User',
};
```

**Risk:** If `NODE_ENV` is accidentally set to `'development'` in production, any user can sign in with any credentials without database verification.

**Recommendation:**
1. Remove development bypass before production deployment
2. Add explicit environment check: `process.env.NODE_ENV !== 'production'`
3. Add feature flag: `process.env.ALLOW_DEV_AUTH === 'true'`
4. Log warnings when development mode is enabled

---

#### 2. Incomplete OAuth Account Linking
**Location:** `app/api/auth/[...nextauth]/route.ts:286-295` and `330-339`
**Severity:** HIGH
**CWE:** CWE-347 (Improper Verification of Cryptographic Signature)

**Issue:**
```typescript
// Lines 286-295
if (existingUser) {
  // User exists with this email but no Google ID
  // Link Google account to existing user
  // Note: This will be implemented with linkOAuthProvider in a later task
  // For now, just allow sign-in
  return true;
}
```

**Risk:** OAuth accounts are not properly linked to existing user accounts in the database. This creates a security vulnerability where:
- Users can create multiple accounts with the same email
- Account hijacking is possible
- Audit trail is incomplete

**Recommendation:**
1. Implement `linkOAuthProvider` function before production deployment
2. Update the signIn callback to properly link OAuth accounts
3. Add database transaction to ensure atomic account linking

---

#### 3. Missing Password Strength Enforcement
**Location:** `lib/auth.ts` and `app/api/auth/[...nextauth]/route.ts`
**Severity:** HIGH
**CWE:** CWE-521 (Weak Password Requirements)

**Issue:** Password strength validation is defined in `lib/auth.ts:193-250` (`validatePasswordStrength`) but is NOT enforced in:
- User registration flow
- Password change flow
- Credentials provider in NextAuth

**Risk:** Users can create weak passwords that are vulnerable to brute force attacks.

**Recommendation:**
1. Add `validatePasswordStrength` check to user registration endpoint
2. Add password strength validation to password reset flow
3. Enforce strong passwords in credentials provider

---

### 🟡 MEDIUM RISK ISSUES

#### 4. Excessive Session Duration
**Location:** `app/api/auth/[...nextauth]/route.ts:212`
**Severity:** MEDIUM
**CWE:** CWE-613 (Insufficient Session Expiration)

**Issue:**
```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

**Risk:** 30-day JWT tokens increase the window of opportunity for token theft and unauthorized access.

**Recommendation:**
- Reduce to 7 days or implement refresh token rotation
- Add "remember me" option with longer sessions
- Implement token revocation on password change

---

#### 5. Debug Mode Information Leakage
**Location:** `app/api/auth/[...nextauth]/route.ts:460`
**Severity:** MEDIUM
**CWE:** CWE-209 (Information Exposure Through an Error Message)

**Issue:**
```typescript
debug: process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG === 'true',
```

**Risk:** If `NEXTAUTH_DEBUG` is enabled in production, sensitive information may be logged.

**Recommendation:**
- Ensure NEXTAUTH_DEBUG is never set in production
- Add explicit check: `process.env.NODE_ENV !== 'production'`
- Add log sanitization in production

---

#### 6. Missing NEXTAUTH_SECRET Validation
**Location:** `app/api/auth/[...nextauth]/route.ts:468`
**Severity:** MEDIUM
**CWE:** CWE-321 (Use of Hard-coded Cryptographic Key)

**Issue:**
```typescript
secret: process.env.NEXTAUTH_SECRET,
```

No validation that NEXTAUTH_SECRET exists or has sufficient entropy (minimum 32 bytes).

**Recommendation:**
```typescript
const secret = process.env.NEXTAUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('NEXTAUTH_SECRET must be at least 32 characters');
}
```

---

#### 7. No Rate Limiting
**Location:** `app/api/auth/[...nextauth]/route.ts`
**Severity:** MEDIUM
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)

**Issue:** No rate limiting on authentication endpoints, making the system vulnerable to:
- Brute force attacks on passwords
- Enumeration attacks on email addresses
- DoS attacks on OAuth callbacks

**Recommendation:**
- Implement rate limiting using Cloudflare Workers rate limiter
- Add IP-based rate limiting (max 5 failed attempts per 15 minutes)
- Add account lockout after 10 failed attempts

---

#### 8. SQL Injection Risk in Dynamic Query Building
**Location:** `lib/db.ts:415-450`
**Severity:** MEDIUM
**CWE:** CWE-89 (SQL Injection)

**Issue:**
```typescript
const fields: string[] = [];
const values: unknown[] = [];
// ... dynamically build query
const result = await queryRun(db, `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
```

**Risk:** While the current implementation uses parameterized queries correctly, the dynamic field building is fragile and could be vulnerable if field names are not validated.

**Recommendation:**
- Add whitelist of allowed fields
- Validate field names against schema
- Consider using a query builder library

---

### 🟢 LOW RISK / POSITIVE FINDINGS

#### ✅ Strong Password Hashing
- **bcrypt with cost factor 12** - Excellent choice
- Proper salt handling
- Constant-time comparison

#### ✅ Parameterized SQL Queries
- All database queries use parameterized queries
- Prepared statements properly used
- SQL injection protection in place

#### ✅ OAuth Provider Configuration
- `allowDangerousEmailAccountLinking: false` - Correctly disabled
- Secure Apple Sign-In implementation with JWT
- Google OAuth properly configured

#### ✅ Environment Variable Handling
- `.env.example` provided with guidance
- Secrets not hardcoded
- Clear documentation for setup

#### ✅ Error Handling
- Generic error messages (no information leakage)
- Try-catch blocks in all async functions
- Proper error logging without exposing details

---

## Security Best Practices Observed

1. ✅ Passwords never stored in plain text
2. ✅ JWT strategy for stateless session management
3. ✅ Database binding properly typed with TypeScript
4. ✅ Audit logging infrastructure in place
5. ✅ Session management through secure cookies
6. ✅ OAuth state parameter validation (handled by NextAuth)
7. ✅ CSRF protection (built into NextAuth)
8. ✅ Proper type safety throughout

---

## Missing Security Features

1. ❌ Multi-Factor Authentication (MFA)
2. ❌ Password reset flow (not yet implemented)
3. ❌ Email verification
4. ❌ Account lockout mechanism
5. ❌ IP-based anomaly detection
6. ❌ Session management UI (view/revoke sessions)
7. ❌ Security headers (CSP, HSTS, etc.)
8. ❌ Content Security Policy

---

## Recommended Actions

### Before Production Deployment:

**Critical:**
1. ✅ Remove development authentication bypass (Issue #1)
2. ✅ Implement OAuth account linking (Issue #2)
3. ✅ Enforce password strength validation (Issue #3)
4. ✅ Add NEXTAUTH_SECRET validation (Issue #6)
5. ✅ Implement rate limiting (Issue #7)

**High Priority:**
6. Reduce session duration or implement refresh tokens (Issue #4)
7. Add security headers to Next.js configuration
8. Implement audit logging for authentication events
9. Add proper error monitoring (Sentry, etc.)

**Medium Priority:**
10. Implement password reset flow
11. Add email verification
12. Consider implementing MFA for admin users
13. Add session management UI

---

## Compliance Notes

### GDPR (UK/EU)
- ✅ Audit logging in place (Article 30)
- ✅ User data accessible through API
- ⚠️ Missing "right to be forgotten" endpoint
- ⚠️ Missing data export functionality

### OWASP Top 10 (2021)
- ✅ A01:2021 – Broken Access Control (partially addressed)
- ⚠️ A02:2021 – Cryptographic Failures (session duration)
- ✅ A03:2021 – Injection (SQL injection protected)
- ⚠️ A04:2021 – Insecure Design (no MFA)
- ⚠️ A07:2021 – Identification and Authentication Failures (rate limiting)

---

## Conclusion

The authentication system demonstrates a solid foundation with many security best practices already implemented. However, **the 3 HIGH-RISK issues must be addressed before production deployment** to prevent potential security breaches.

The primary concerns are:
1. Development code that could accidentally run in production
2. Incomplete OAuth account linking
3. Missing password strength enforcement

Once these issues are resolved, the system will provide a secure authentication foundation for the UK Takeaway Phone Order Assistant Dashboard.

---

**Next Review:** After implementing recommended fixes
**Reviewed Files:** 4
**Lines of Code:** ~1,500
**Time Invested:** Comprehensive manual security audit
