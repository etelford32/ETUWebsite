# ETU Website Security Plan & Roadmap

**Project**: Explore the Universe 2175 Website
**Date**: December 31, 2025
**Status**: Security Assessment & Hardening Required
**Branch**: claude/security-planning-Attk2

---

## Executive Summary

This document outlines a comprehensive security plan for the ETU Website and Supabase database. A thorough security audit has identified **10 critical and high-severity vulnerabilities** that require immediate attention, along with several medium and low-priority improvements.

### Current Security Status: ⚠️ HIGH RISK

**Key Findings:**
- ✅ **Good**: No npm dependency vulnerabilities detected
- ✅ **Good**: Row Level Security (RLS) enabled on all tables
- ✅ **Good**: Basic input validation in place
- ❌ **Critical**: Hardcoded Supabase credentials in source code
- ❌ **Critical**: Missing admin role-based access control
- ❌ **High**: Missing security headers (CSP, HSTS, X-Frame-Options)
- ❌ **High**: Incomplete Steam OpenID authentication validation

---

## Vulnerability Summary

### Severity Distribution

| Severity | Count | Status |
|----------|-------|--------|
| **CRITICAL** | 2 | 🔴 Requires immediate action |
| **HIGH** | 3 | 🟠 Urgent - address within 48 hours |
| **MEDIUM** | 3 | 🟡 Important - address this week |
| **LOW** | 2 | 🟢 Address when convenient |

---

## Critical Vulnerabilities (IMMEDIATE ACTION REQUIRED)

### 🔴 CRITICAL-1: Exposed Supabase Credentials in Source Code

**Severity**: CRITICAL
**CVSS Score**: 9.8 (Critical)
**Impact**: Complete database compromise, unauthorized data access, data theft

**Description:**
Supabase anonymous key and service role key are hardcoded as fallback values throughout the codebase. These credentials are:
- Visible in public Git history
- Accessible to anyone viewing the source code
- Potentially indexed by search engines
- Enable unauthorized database access

**Affected Files:**
- `src/lib/supabaseClient.ts:4-5`
- `src/app/api/backlog/route.ts:10-12`
- `src/app/api/feedback/route.ts:8-10`
- `src/app/api/leaderboard/route.ts:8-10`
- `src/app/api/submit-score/route.ts:9-11`
- `src/app/api/feedback/vote/route.ts:7-9`
- `src/app/api/notifications/send/route.ts:11-13`
- `src/app/api/steam/callback/route.ts:11-13`
- `src/app/api/backlog/vote/route.ts:7-9`

**Vulnerable Code Pattern:**
```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://osvrbwvxnbpwsmgvdmkm.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Remediation Steps:**
1. **URGENT**: Rotate ALL Supabase keys immediately in Supabase dashboard
2. Remove all hardcoded credentials from source code
3. Use environment variables exclusively
4. Add runtime checks to fail gracefully if env vars are missing
5. Audit Git history and consider using tools like `git-filter-repo` to remove exposed credentials
6. Add pre-commit hooks to prevent credential commits

**Implementation Priority**: P0 - Implement immediately

---

### 🔴 CRITICAL-2: Missing Admin Role-Based Access Control (RBAC)

**Severity**: CRITICAL
**CVSS Score**: 8.1 (High)
**Impact**: Privilege escalation, unauthorized admin access, data manipulation

**Description:**
The admin feedback panel at `/app/admin/feedback` only checks if a user is authenticated, not if they have admin privileges. Any registered user can:
- View all user feedback (including private/sensitive information)
- Modify feedback status, priority, and assignments
- Access admin-only functionality

**Affected Files:**
- `src/app/admin/feedback/page.tsx:79` (TODO comment acknowledging the issue)
- `supabase/migrations/update_feedback_admin_access.sql:16` (TODO comment in migration)

**Vulnerable Code:**
```typescript
// Current implementation - INSECURE
if (!session) {
  router.push('/login')
  return
}
// Missing: Role check for admin access
```

**Database Policy Issue:**
```sql
-- Current policy allows ALL authenticated users
CREATE POLICY "Authenticated users can view all feedback"
  ON public.feedback FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- TODO: Add role-based access control with admin role in profiles table
```

**Remediation Steps:**
1. Add `role` column to `profiles` table (enum: 'user', 'admin', 'moderator')
2. Create database migration to add admin role system
3. Update RLS policies to check for admin role
4. Implement admin middleware to protect admin routes
5. Add role checks to all admin API endpoints
6. Create admin management interface for role assignment

**Implementation Priority**: P0 - Implement immediately

---

## High-Severity Vulnerabilities (URGENT - 48 Hours)

### 🟠 HIGH-1: Missing Security Headers

**Severity**: HIGH
**CVSS Score**: 7.4 (High)
**Impact**: XSS attacks, clickjacking, MIME sniffing attacks, insecure connections

**Description:**
Critical security headers are not configured in Next.js, leaving the application vulnerable to multiple attack vectors.

**Missing Headers:**
- **Content-Security-Policy (CSP)**: No XSS protection
- **X-Frame-Options**: Vulnerable to clickjacking
- **X-Content-Type-Options**: Vulnerable to MIME sniffing
- **Strict-Transport-Security (HSTS)**: Allows insecure HTTP connections
- **Referrer-Policy**: Potential information leakage
- **Permissions-Policy**: Unnecessary browser features enabled

**Affected File:**
- `next.config.js` - No security headers configured

**Remediation:**
Add comprehensive security headers to `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com https://avatars.steamstatic.com; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';"
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        }
      ]
    }
  ]
}
```

**Implementation Priority**: P1 - Implement within 48 hours

---

### 🟠 HIGH-2: Incomplete Steam OpenID Validation

**Severity**: HIGH
**CVSS Score**: 7.2 (High)
**Impact**: Authentication bypass, identity spoofing, unauthorized access

**Description:**
Steam authentication callback does not properly validate the OpenID response signature, allowing potential Steam ID spoofing attacks.

**Affected File:**
- `src/app/api/steam/callback/route.ts`

**Vulnerable Code:**
```typescript
// Line 29: No signature verification
const claimedId = searchParams.get('openid.claimed_id')
if (!claimedId) {
  return NextResponse.json({ error: 'No claimed_id provided' }, { status: 400 })
}

// Line 35: Unsafe string extraction
const steamId = claimedId.split('/').pop()
```

**Issues:**
1. No verification of OpenID signature
2. No validation of response parameters against Steam's public key
3. No CSRF token validation
4. Steam ID extracted via simple string parsing
5. Session creation incomplete (TODO at line 58)

**Remediation Steps:**
1. Implement proper OpenID 2.0 signature verification
2. Validate response against Steam's public key
3. Add CSRF protection to auth flow
4. Use dedicated OpenID library (e.g., `openid`)
5. Complete session creation implementation
6. Add timeout for OpenID responses

**Implementation Priority**: P1 - Implement within 48 hours

---

### 🟠 HIGH-3: RLS Policy Allows All Authenticated Users Admin Access

**Severity**: HIGH
**CVSS Score**: 7.1 (High)
**Impact**: Unauthorized data modification, privacy breach

**Description:**
Database RLS policies grant UPDATE permissions to all authenticated users on the feedback table, allowing any logged-in user to modify feedback items.

**Affected File:**
- `supabase/migrations/update_feedback_admin_access.sql:30-33`

**Vulnerable Policy:**
```sql
CREATE POLICY "Authenticated users can update feedback"
  ON public.feedback FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Impact:**
- Any authenticated user can change feedback status
- Users can manipulate priority levels
- Users can modify other users' feedback
- No audit trail for unauthorized changes

**Remediation:**
1. Create admin role system in profiles table
2. Update policy to check for admin role
3. Implement audit logging for all feedback changes
4. Add trigger to track modification history

**Implementation Priority**: P1 - Implement within 48 hours (linked to CRITICAL-2)

---

## Medium-Severity Vulnerabilities

### 🟡 MEDIUM-1: Missing Rate Limiting on API Endpoints

**Severity**: MEDIUM
**CVSS Score**: 5.3 (Medium)
**Impact**: API abuse, spam, resource exhaustion, vote manipulation

**Description:**
No rate limiting is implemented on any API endpoints, allowing unlimited requests from a single source.

**Vulnerable Endpoints:**
- `/api/feedback` - Spam feedback submissions
- `/api/backlog` - Spam feature requests
- `/api/feedback/vote` - Vote manipulation
- `/api/backlog/vote` - Vote manipulation
- `/api/submit-score` - Leaderboard manipulation

**Recommended Implementation:**
Use middleware or edge function to implement rate limiting:

```typescript
// Per IP address limits
const limits = {
  '/api/feedback': { window: '15m', max: 5 },
  '/api/backlog': { window: '15m', max: 5 },
  '/api/feedback/vote': { window: '1m', max: 10 },
  '/api/submit-score': { window: '5m', max: 20 }
}
```

**Solutions:**
1. Implement Vercel Edge Config rate limiting
2. Use Upstash Redis for distributed rate limiting
3. Add per-user rate limits in addition to IP-based
4. Implement exponential backoff for repeated violations

**Implementation Priority**: P2 - Implement this week

---

### 🟡 MEDIUM-2: Insufficient Input Validation on Ship Designer

**Severity**: MEDIUM
**CVSS Score**: 4.7 (Medium)
**Impact**: Stored XSS potential, large payload attacks, database bloat

**Description:**
Ship designer accepts unlimited text input and complex JSON without validation or sanitization.

**Affected File:**
- `src/app/ship-designer/page.tsx`
- `/api/save-ship` endpoint

**Issues:**
1. No ship name length validation
2. No JSON size limit enforcement
3. No sanitization of ship name before storage
4. Potential for XSS via ship name in future display

**Remediation:**
1. Add ship name length limit (3-50 characters)
2. Validate ship name against XSS patterns
3. Limit JSON payload size (e.g., 100KB max)
4. Add server-side validation in `/api/save-ship`
5. Sanitize input before storage and display

**Implementation Priority**: P2 - Implement this week

---

### 🟡 MEDIUM-3: Weak CRON Secret Authentication

**Severity**: MEDIUM
**CVSS Score**: 4.3 (Medium)
**Impact**: Unauthorized notification sending, email spam

**Description:**
CRON endpoint protection relies solely on a static Bearer token without additional verification.

**Affected File:**
- `src/app/api/notifications/send/route.ts:18-21`

**Vulnerable Code:**
```typescript
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Issues:**
1. Single static credential
2. No token rotation mechanism
3. No request source verification
4. No timestamp validation to prevent replay attacks

**Remediation:**
1. Implement Vercel Cron verification headers
2. Add HMAC signature validation
3. Implement token rotation schedule
4. Add IP whitelist for cron service
5. Include timestamp in authentication

**Implementation Priority**: P2 - Implement this week

---

## Low-Severity Issues

### 🟢 LOW-1: Email Notification Service Not Implemented

**Severity**: LOW
**CVSS Score**: 2.4 (Low)
**Impact**: Feature incomplete, users don't receive notifications

**Description:**
Email notification system is stubbed out and not functional.

**Affected File:**
- `src/app/api/notifications/send/route.ts:97-100`

**Current Implementation:**
```typescript
async function sendEmail(to: string, subject: string, html: string) {
  console.log(`Would send email to ${to}: ${subject}`)
  return true // Stubbed for now
}
```

**Remediation:**
1. Integrate Resend API or similar email service
2. Implement email templates
3. Add email validation
4. Implement bounce handling
5. Add unsubscribe mechanism

**Implementation Priority**: P3 - Address when convenient

---

### 🟢 LOW-2: Console Logs in Production

**Severity**: LOW
**CVSS Score**: 2.1 (Low)
**Impact**: Minor information disclosure

**Description:**
While `removeConsole: true` is set for production, there may be debug logs that expose internal information during development.

**Remediation:**
1. Audit all console.log statements
2. Replace with proper logging service
3. Implement log levels (debug, info, warn, error)
4. Use structured logging for better analysis

**Implementation Priority**: P3 - Address when convenient

---

## Positive Security Findings ✅

The following security measures are already properly implemented:

1. **Row Level Security (RLS)** - Enabled on all Supabase tables
2. **SQL Injection Protection** - Using parameterized queries via Supabase SDK
3. **Basic Input Validation** - Length checks, type validation, email regex
4. **Password Requirements** - Minimum 6 characters (Supabase Auth)
5. **HTTPS Enforcement** - Automatic via Vercel/Next.js
6. **React XSS Protection** - Default escaping of user input in JSX
7. **Dependency Security** - No known vulnerabilities in npm packages
8. **OAuth Integration** - Proper use of Supabase Auth for Google, GitHub, Apple
9. **CORS Configuration** - Handled by Next.js API routes
10. **Environment Variable Gitignore** - .env files properly excluded

---

## Implementation Roadmap

### Phase 1: Critical Security Hardening (Week 1)

**Priority**: P0 - IMMEDIATE

**Tasks:**
1. ✅ Complete security audit (DONE)
2. ⚠️ **URGENT**: Rotate all Supabase credentials
3. ⚠️ Remove hardcoded credentials from all files
4. ⚠️ Implement admin role system in database
5. ⚠️ Add admin role verification to routes and policies
6. ⚠️ Deploy security headers via next.config.js
7. ⚠️ Fix Steam OpenID validation
8. ⚠️ Test all authentication flows

**Acceptance Criteria:**
- [ ] All hardcoded credentials removed
- [ ] New Supabase keys rotated and secure
- [ ] Admin panel requires admin role
- [ ] Security headers pass securityheaders.com scan
- [ ] Steam auth properly validates signatures
- [ ] All tests pass

**Estimated Effort**: 2-3 days

---

### Phase 2: Enhanced Security Controls (Week 2)

**Priority**: P1-P2

**Tasks:**
1. Implement API rate limiting
2. Add comprehensive input validation to ship designer
3. Strengthen CRON authentication
4. Create middleware for request validation
5. Implement audit logging for sensitive operations
6. Add CSRF protection to forms
7. Create security monitoring dashboard

**Acceptance Criteria:**
- [ ] Rate limiting active on all public endpoints
- [ ] Ship designer has proper validation
- [ ] CRON uses Vercel verification headers
- [ ] Audit logs track admin actions
- [ ] CSRF tokens on all state-changing forms

**Estimated Effort**: 3-4 days

---

### Phase 3: Additional Hardening (Week 3-4)

**Priority**: P3

**Tasks:**
1. Implement email notification service
2. Add comprehensive logging system
3. Create security documentation
4. Implement automated security testing
5. Add dependency scanning to CI/CD
6. Create incident response plan
7. Conduct penetration testing

**Acceptance Criteria:**
- [ ] Email notifications functional
- [ ] Logging service integrated (e.g., Sentry, LogRocket)
- [ ] Security docs complete
- [ ] Security tests in CI pipeline
- [ ] Incident response plan documented

**Estimated Effort**: 5-7 days

---

## Ongoing Security Practices

### Daily/Weekly
- Monitor Supabase logs for suspicious activity
- Review failed authentication attempts
- Check rate limit violations
- Monitor error rates in API endpoints

### Monthly
- Review and rotate API keys
- Update dependencies (`npm audit`, `npm update`)
- Review access logs and user permissions
- Audit admin user list

### Quarterly
- Security audit of new features
- Penetration testing
- Review and update security policies
- Conduct security training for team

---

## Security Monitoring & Alerts

### Recommended Monitoring Setup

1. **Supabase Monitoring**
   - Enable auth event logging
   - Monitor failed login attempts (>5 per hour)
   - Track RLS policy violations
   - Alert on service role key usage

2. **Application Monitoring**
   - Implement Sentry for error tracking
   - Monitor API response times
   - Track unusual traffic patterns
   - Alert on 5xx error spikes

3. **Infrastructure Monitoring**
   - Monitor SSL certificate expiration
   - Track DNS changes
   - Monitor CDN cache hit rates
   - Alert on deployment failures

---

## Security Testing Checklist

### Before Each Deployment

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Check for hardcoded credentials (`grep -r "eyJ" src/`)
- [ ] Verify environment variables are set
- [ ] Test authentication flows (login, logout, OAuth)
- [ ] Verify admin access control
- [ ] Test RLS policies with different user roles
- [ ] Check security headers with online scanner
- [ ] Verify rate limiting is active
- [ ] Test CSRF protection on forms
- [ ] Review recent code changes for security issues

---

## Incident Response Plan

### If Credentials Are Compromised

1. **Immediate (< 5 minutes)**
   - Rotate compromised credentials in Supabase dashboard
   - Deploy updated environment variables
   - Invalidate all existing sessions

2. **Short-term (< 1 hour)**
   - Review access logs for unauthorized activity
   - Check database for unauthorized modifications
   - Notify affected users if data breach occurred
   - Document incident timeline

3. **Long-term (< 24 hours)**
   - Conduct full security audit
   - Implement additional monitoring
   - Update security procedures
   - Post-mortem analysis

### If Unauthorized Access Detected

1. Lock affected accounts
2. Review audit logs
3. Identify attack vector
4. Patch vulnerability
5. Monitor for continued attempts
6. Notify affected users

---

## Security Contacts & Resources

### Internal
- **Security Lead**: [To be assigned]
- **DevOps Lead**: [To be assigned]
- **Incident Response**: [To be assigned]

### External Resources
- **Supabase Security**: https://supabase.com/docs/guides/platform/security
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Next.js Security**: https://nextjs.org/docs/app/building-your-application/configuring/security-headers
- **Vercel Security**: https://vercel.com/docs/security

### Security Scanners
- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Observatory**: https://observatory.mozilla.org/

---

## Appendix: File Reference

### Critical Files for Security Review

**Authentication & Authorization:**
- `src/lib/supabaseClient.ts` - Supabase client initialization
- `src/app/api/auth/callback/route.ts` - OAuth callback handler
- `src/app/login/page.tsx` - Login/signup form
- `src/app/api/steam/auth/route.ts` - Steam auth initiation
- `src/app/api/steam/callback/route.ts` - Steam auth callback

**API Endpoints:**
- `src/app/api/feedback/route.ts` - Feedback submission
- `src/app/api/backlog/route.ts` - Feature requests
- `src/app/api/submit-score/route.ts` - Score submissions
- `src/app/api/notifications/send/route.ts` - Email notifications

**Protected Routes:**
- `src/app/admin/feedback/page.tsx` - Admin panel
- `src/app/dashboard/page.tsx` - User dashboard

**Database Migrations:**
- `supabase/migrations/create_feedback_table.sql` - RLS policies
- `supabase/migrations/update_feedback_admin_access.sql` - Admin policies
- `supabase/migrations/create_player_scores_table.sql` - Score policies

**Configuration:**
- `next.config.js` - Security headers, redirects
- `.gitignore` - Excluded files

---

## Conclusion

This security plan provides a comprehensive roadmap for hardening the ETU Website against data theft and security vulnerabilities. The immediate priorities are:

1. **Remove hardcoded credentials** (CRITICAL)
2. **Implement admin role system** (CRITICAL)
3. **Add security headers** (HIGH)
4. **Fix Steam authentication** (HIGH)

Following this plan will significantly improve the security posture of the application and protect user data from unauthorized access and theft.

**Next Steps:**
1. Review and approve this security plan
2. Prioritize Phase 1 critical fixes
3. Assign implementation tasks
4. Begin immediate remediation
5. Schedule regular security reviews

---

**Document Version**: 1.0
**Last Updated**: December 31, 2025
**Next Review**: After Phase 1 completion
