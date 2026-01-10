# 🔒 Security Recommendations & Best Practices

## Current Security Status: ✅ STRONG

Your authentication and user profile system is already well-secured! This document provides recommendations for maintaining and enhancing security.

---

## 🎯 Executive Summary

### What's Already Secure ✅

1. **Zero Client-Side Database Exposure**
   - No Supabase keys exposed to browser
   - All database operations through server-side API routes
   - Client-side Supabase intentionally disabled with error throwing

2. **Server-Side Authentication**
   - HTTP-only, secure session cookies
   - 7-day session expiration
   - Proper SameSite and secure flags

3. **Database-Level Security**
   - Row Level Security (RLS) enabled on all tables
   - Users can only access/modify their own data
   - Admin/moderator role enforcement

4. **API Security**
   - Input validation on all endpoints
   - Bearer token validation for authenticated requests
   - Role-based access control (RBAC)
   - Proper HTTP status codes

5. **Middleware Protection**
   - Protected routes require authentication
   - Admin routes check for admin/moderator roles
   - Automatic redirects for unauthorized access

---

## 🚀 Priority Security Enhancements

### 1. Rate Limiting (HIGH PRIORITY)

**Current Gap:** No rate limiting on API routes

**Recommendation:** Implement rate limiting to prevent:
- Brute force login attempts
- DDoS attacks
- API abuse
- Spam submissions

**Implementation:**

```typescript
// Install: npm install @upstash/ratelimit @upstash/redis

// src/lib/ratelimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create rate limiters for different endpoints
export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15m"), // 5 attempts per 15 mins
  analytics: true,
});

export const apiRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1m"), // 100 requests per minute
  analytics: true,
});

// Usage in API routes:
export async function POST(req: Request) {
  const identifier = req.headers.get('x-forwarded-for') || 'anonymous';
  const { success } = await authRatelimit.limit(identifier);

  if (!success) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  // Continue with route logic...
}
```

**Alternative (Simple, No Redis):**
```typescript
// src/lib/simpleRatelimit.ts
const attempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const userAttempts = attempts.get(identifier);

  // Reset if window expired
  if (!userAttempts || now > userAttempts.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingAttempts: maxAttempts - 1 };
  }

  // Increment attempts
  userAttempts.count++;

  if (userAttempts.count > maxAttempts) {
    return { allowed: false, remainingAttempts: 0 };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - userAttempts.count
  };
}
```

**Apply to these routes:**
- `/api/auth/login` - 5 attempts per 15 minutes
- `/api/auth/signup` - 3 attempts per hour
- `/api/submit-score` - 10 submissions per minute
- `/api/profile` (PATCH) - 20 updates per hour
- `/api/feedback` - 5 submissions per hour

---

### 2. Enhanced Password Security (MEDIUM PRIORITY)

**Current:** Using Supabase's built-in authentication (already good!)

**Recommendations:**

1. **Enforce Strong Passwords:**
```typescript
// src/lib/passwordValidation.ts
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check against common passwords
  const commonPasswords = ['password123', 'qwerty123', '123456789'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

2. **Configure in Supabase Dashboard:**
   - Go to Authentication → Policies
   - Set minimum password length: 12
   - Enable breach detection
   - Require email confirmation (if not already enabled)

---

### 3. Enhanced Session Security (MEDIUM PRIORITY)

**Current:** 7-day static sessions (good start)

**Recommendations:**

1. **Implement Session Rotation:**
```typescript
// src/lib/session.ts
import { cookies } from 'next/headers';

export async function rotateSession(userId: string) {
  // Generate new session ID
  const newSessionId = crypto.randomUUID();

  // Update session in database
  await supabase
    .from('user_sessions')
    .update({
      session_id: newSessionId,
      last_rotated: new Date().toISOString()
    })
    .eq('user_id', userId);

  // Update cookie
  const cookieStore = cookies();
  const sessionData = await getSessionData(userId);

  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  });
}

// Call this periodically or after sensitive actions
```

2. **Track Active Sessions:**
```sql
-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Index for fast lookups
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);
```

3. **Add Session Management API:**
```typescript
// src/app/api/auth/sessions/route.ts
export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', session.userId)
    .eq('is_active', true)
    .order('last_activity', { ascending: false });

  return Response.json({ sessions });
}

// Revoke a session
export async function DELETE(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await req.json();

  const supabase = createServerClient();
  await supabase
    .from('user_sessions')
    .update({ is_active: false })
    .eq('session_id', sessionId)
    .eq('user_id', session.userId);

  return Response.json({ success: true });
}
```

---

### 4. Two-Factor Authentication (LOWER PRIORITY)

**Status:** Not currently implemented

**When to implement:** When you have users with sensitive data or admin accounts

**Recommendation:** Use Supabase's built-in MFA

```typescript
// Enable in Supabase Dashboard:
// Authentication → Providers → Phone (SMS) or TOTP

// Client-side enrollment:
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'My Auth App'
});

// Show QR code to user, they scan with authenticator app

// Verification on login:
const { data, error } = await supabase.auth.mfa.verify({
  factorId: 'factor-id-from-enrollment',
  challengeId: 'challenge-id-from-login',
  code: 'user-entered-code'
});
```

---

### 5. Enhanced Input Validation (MEDIUM PRIORITY)

**Current:** Basic validation exists

**Recommendation:** Implement comprehensive validation

```typescript
// src/lib/validation.ts
import { z } from 'zod';

// User profile validation
export const profileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .refine(val => !val.toLowerCase().includes('admin'), 'Username cannot contain "admin"'),

  avatar_url: z.string()
    .url('Invalid avatar URL')
    .optional()
    .refine(
      val => !val || val.startsWith('https://'),
      'Avatar URL must use HTTPS'
    ),

  faction_choice: z.enum(['crystal', 'mycelari', 'megabot', 'wild']).optional(),
});

// Score submission validation
export const scoreSchema = z.object({
  score: z.number()
    .int('Score must be an integer')
    .min(0, 'Score cannot be negative')
    .max(1000000, 'Score is unrealistically high'),

  level: z.number().int().min(1).max(100),

  metadata: z.object({
    duration: z.number().min(0).max(86400), // Max 24 hours
    kills: z.number().int().min(0).max(10000),
  }).optional(),
});

// Usage in API routes:
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const validated = profileSchema.parse(body);

    // Continue with validated data...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}
```

**Install:** `npm install zod`

---

### 6. Enhanced Logging & Monitoring (HIGH PRIORITY)

**Current Gap:** Limited security event logging

**Recommendation:** Implement comprehensive audit logging

```sql
-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

```typescript
// src/lib/auditLog.ts
import { createServerClient } from './supabaseServer';

export async function logAuditEvent(
  userId: string | null,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>,
  req?: Request
) {
  const supabase = createServerClient();

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: req?.headers.get('x-forwarded-for') || null,
    user_agent: req?.headers.get('user-agent') || null,
    metadata: metadata || {}
  });
}

// Usage in API routes:
await logAuditEvent(
  session.userId,
  'profile.update',
  'profile',
  session.userId,
  { fields: Object.keys(updates) },
  req
);

await logAuditEvent(
  session.userId,
  'auth.login',
  'session',
  sessionId,
  { method: 'email' },
  req
);

await logAuditEvent(
  session.userId,
  'score.submit',
  'score',
  scoreId,
  { score: scoreValue, verified: false },
  req
);
```

**Events to log:**
- Authentication (login, logout, failed attempts, signup)
- Profile changes (username, avatar, settings)
- Admin actions (user bans, role changes, deletions)
- Security events (suspicious activity, rate limit hits)
- Score submissions and verifications

---

### 7. API Response Security (LOW PRIORITY)

**Current:** Basic error messages

**Recommendation:** Sanitize error messages

```typescript
// src/lib/apiResponse.ts
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): Response {
  // Log full error server-side
  console.error('API Error:', error);

  // Never expose internal errors to client
  const message = process.env.NODE_ENV === 'development'
    ? error instanceof Error ? error.message : defaultMessage
    : defaultMessage;

  return Response.json(
    { error: message },
    { status: 500 }
  );
}

// Usage:
try {
  // API logic...
} catch (error) {
  return createErrorResponse(error, 'Failed to update profile');
}
```

---

### 8. Content Security Policy (ALREADY IMPLEMENTED ✅)

Your Next.js config already has excellent CSP headers! Current setup includes:

```javascript
// From next.config.js
'Content-Security-Policy': [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live ...",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co ...",
  // ...and more
]
```

**Recommendation:** Consider tightening when possible:
- Remove `'unsafe-inline'` for scripts (requires refactoring inline scripts)
- Add nonces for inline scripts
- Use strict dynamic when ready

---

### 9. Dependency Security (ONGOING)

**Recommendations:**

1. **Enable Dependabot:**
   - Go to GitHub repository → Settings → Security → Code security and analysis
   - Enable Dependabot alerts and security updates

2. **Regular audits:**
```bash
# Run regularly
npm audit

# Fix vulnerabilities
npm audit fix

# Force fixes (with breaking changes)
npm audit fix --force
```

3. **Use `.npmrc` to enforce security:**
```
# .npmrc
audit=true
audit-level=moderate
```

---

### 10. Environment Variable Security (ALREADY STRONG ✅)

Your current setup is excellent:

✅ No `NEXT_PUBLIC_` variables for sensitive data
✅ Server-only environment variables
✅ `.env.example` provided for documentation
✅ Keys not committed to repository

**Additional recommendation:** Add to Vercel:
- Enable "Encrypted Environment Variables" in Vercel dashboard
- Use Vercel's secret management for production

---

## 🎯 Implementation Priority

### Immediate (Do Now)
1. ✅ Fix client-side Supabase references (DONE!)
2. Create `.env.example` (DONE!)
3. Enable Dependabot on GitHub

### Short-term (Next Week)
1. Implement rate limiting on auth endpoints
2. Add audit logging for security events
3. Implement password strength validation
4. Add session management API

### Medium-term (Next Month)
1. Implement comprehensive input validation with Zod
2. Add active session tracking
3. Set up monitoring/alerting for security events

### Long-term (Next Quarter)
1. Implement two-factor authentication
2. Add anomaly detection for suspicious activity
3. Conduct security penetration testing
4. Implement advanced threat detection

---

## 📋 Security Checklist

### Authentication ✅
- [x] Server-side only authentication
- [x] HTTP-only session cookies
- [x] Secure cookie flags (httpOnly, secure, sameSite)
- [x] Session expiration
- [ ] Rate limiting on login
- [ ] Account lockout after failed attempts
- [ ] Password strength requirements
- [ ] Two-factor authentication (optional)

### Authorization ✅
- [x] Role-based access control (RBAC)
- [x] Middleware protection on routes
- [x] Database-level RLS policies
- [x] Admin route protection
- [x] API endpoint role checks

### Data Protection ✅
- [x] No client-side database access
- [x] Environment variables properly secured
- [x] Sensitive data server-side only
- [x] User data isolated via RLS
- [ ] Data encryption at rest (via Supabase)
- [ ] Audit logging

### API Security ✅
- [x] Input validation
- [x] Bearer token validation
- [x] Proper HTTP status codes
- [x] Error handling
- [ ] Rate limiting
- [ ] Request size limits
- [ ] Comprehensive validation (Zod)

### Infrastructure ✅
- [x] HTTPS enforcement
- [x] Security headers (CSP, HSTS, etc.)
- [x] CORS configuration
- [x] Secure cookie settings
- [ ] DDoS protection (via Vercel)
- [ ] WAF rules (optional)

### Monitoring & Response
- [ ] Security event logging
- [ ] Audit trail for sensitive actions
- [ ] Anomaly detection
- [ ] Incident response plan
- [ ] Regular security audits

---

## 🚨 Security Incident Response Plan

### If a Security Breach Occurs:

1. **Immediate Actions:**
   - Revoke compromised credentials immediately
   - Rotate all API keys and secrets
   - Check audit logs for unauthorized access
   - Disable affected accounts if necessary

2. **Investigation:**
   - Review server logs and database activity
   - Identify scope of breach (what data was accessed)
   - Document timeline of events

3. **Remediation:**
   - Patch the vulnerability
   - Force password resets for affected users
   - Notify affected users if required by law
   - Implement additional security measures

4. **Prevention:**
   - Conduct post-mortem analysis
   - Update security procedures
   - Add monitoring for similar attacks
   - Train team on new procedures

### Key Contacts:
- **Security Lead:** [Your Email]
- **Supabase Support:** support@supabase.com
- **Vercel Support:** support@vercel.com

---

## 🔗 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

---

## 📝 Summary

Your application already has **excellent security fundamentals** in place. The key areas for improvement are:

1. **Rate limiting** - Prevent abuse and brute force attacks
2. **Audit logging** - Track security events for compliance and investigation
3. **Enhanced validation** - Comprehensive input validation with Zod
4. **Session management** - Track and manage active sessions

These enhancements will take your already-strong security posture to the next level!

---

**Last Updated:** 2026-01-10
**Next Review:** 2026-02-10
