# Security Checklist
## Quick Reference for Authentication Security

### Pre-Production Checklist

- [ ] **Development Bypass Removed**
  - [ ] Lines 146-151 in route.ts: Remove dev authentication bypass
  - [ ] Lines 268-271 in route.ts: Remove dev mode in signIn callback
  - [ ] Add feature flag for dev mode: `ALLOW_DEV_AUTH`

- [ ] **OAuth Account Linking Implemented**
  - [ ] Google accounts properly linked to existing users
  - [ ] Apple accounts properly linked to existing users
  - [ ] Database transaction ensures atomic linking
  - [ ] Account linking logged in audit trail

- [ ] **Password Strength Enforced**
  - [ ] Registration endpoint validates password strength
  - [ ] Password change validates password strength
  - [ ] Password reset validates password strength
  - [ ] Minimum 8 characters, uppercase, lowercase, number, special char

- [ ] **Session Security**
  - [ ] JWT secret validated on startup (>32 chars)
  - [ ] Session duration reduced to 7 days or less
  - [ ] Refresh token rotation implemented (optional)

- [ ] **Rate Limiting**
  - [ ] Login attempts limited (5 per 15 min per IP)
  - [ ] Account lockout after 10 failed attempts
  - [ ] OAuth callbacks rate limited
  - [ ] Registration rate limited

- [ ] **Environment Security**
  - [ ] NEXTAUTH_SECRET set in production (>32 chars)
  - [ ] NEXTAUTH_DEBUG never set in production
  - [ ] NODE_ENV=production in production
  - [ ] All OAuth credentials properly set

- [ ] **Monitoring & Logging**
  - [ ] Failed login attempts logged
  - [ ] Successful authentication logged
  - [ ] OAuth linking events logged
  - [ ] Error monitoring configured (Sentry, etc.)

### Code Review Checklist

- [ ] No hardcoded credentials
- [ ] No plain text password storage
- [ ] All SQL queries use parameters
- [ ] Error messages don't leak information
- [ ] Debug mode disabled in production
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] CSRF protection enabled

### OAuth Provider Checklist

- [ ] **Google OAuth**
  - [ ] Client ID and Secret set
  - [ ] Redirect URIs configured correctly
  - [ ] Email account linking disabled
  - [ ] State parameter validated

- [ ] **Apple Sign-In**
  - [ ] Services ID configured
  - [ ] Private key and Key ID set
  - [ ] Team ID configured
  - [ ] JWT verification working

### Database Security

- [ ] D1 binding properly configured
- [ ] Prepared statements used for all queries
- [ ] No dynamic SQL with user input
- [ ] Database credentials in environment vars only
- [ ] Connection pooling (if applicable)

### Testing Checklist

- [ ] Unit tests for password hashing
- [ ] Unit tests for password verification
- [ ] Integration tests for OAuth flow
- [ ] Integration tests for credentials flow
- [ ] Security tests for SQL injection
- [ ] Security tests for XSS
- [ ] Security tests for CSRF

### Compliance Checklist

- [ ] GDPR - Right to access data
- [ ] GDPR - Right to deletion
- [ ] GDPR - Data portability
- [ ] GDPR - Audit logging
- [ ] OWASP Top 10 addressed
- [ ] Password policy documented
- [ ] Privacy policy in place

### Deployment Checklist

- [ ] Environment variables reviewed
- [ ] Secrets rotated (if needed)
- [ ] Security headers configured
- [ ] CSP headers configured
- [ ] HSTS enabled
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Referrer-Policy set

---

**Last Updated:** 2026-02-18
**Version:** 1.0.0
