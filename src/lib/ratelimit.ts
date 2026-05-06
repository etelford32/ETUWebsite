/**
 * Simple in-memory rate limiter
 *
 * For production with multiple servers, consider using:
 * - @upstash/ratelimit with Redis
 * - Vercel Edge Config
 * - Database-backed rate limiting
 *
 * This implementation works for single-instance deployments
 * and will reset on server restart (which is acceptable for basic protection)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstAttempt: number;
}

// Store attempts in memory
const attempts = new Map<string, RateLimitEntry>();

// Clean up old entries every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (now > entry.resetAt) {
      attempts.delete(key);
    }
  }
}, 60 * 60 * 1000); // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetAt: number;
  retryAfter?: number; // seconds until reset
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, email, etc.)
 * @param maxAttempts - Maximum number of attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns RateLimitResult with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(identifier);

  // No previous attempts or window expired - allow and start new window
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    attempts.set(identifier, {
      count: 1,
      resetAt,
      firstAttempt: now
    });

    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetAt
    };
  }

  // Increment attempts
  entry.count++;

  // Check if exceeded limit
  if (entry.count > maxAttempts) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      resetAt: entry.resetAt,
      retryAfter
    };
  }

  // Still within limit
  return {
    allowed: true,
    remainingAttempts: maxAttempts - entry.count,
    resetAt: entry.resetAt
  };
}

/**
 * Get identifier from request (IP address + User-Agent for better uniqueness)
 */
export function getIdentifier(req: Request): string {
  // Try to get real IP from various headers (Vercel, Cloudflare, etc.)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';

  // Include user-agent for better uniqueness
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Create a simple hash of user-agent to keep identifier short
  let hash = 0;
  for (let i = 0; i < userAgent.length; i++) {
    const char = userAgent.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `${ip}:${hash}`;
}

/**
 * Get email-based identifier (for user-specific rate limiting)
 */
export function getEmailIdentifier(email: string, req: Request): string {
  const ip = getIdentifier(req);
  return `${email}:${ip}`;
}

/**
 * Middleware helper for rate limiting
 */
export function rateLimitMiddleware(
  maxAttempts: number,
  windowMs: number,
  identifier?: string
) {
  return (req: Request): Response | null => {
    const id = identifier || getIdentifier(req);
    const result = checkRateLimit(id, maxAttempts, windowMs);

    if (!result.allowed) {
      return Response.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': result.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
          }
        }
      );
    }

    return null; // Allow request
  };
}

/**
 * Predefined rate limiters for common use cases
 */
export const RateLimiters = {
  // Strict — for password login. Bumped 5 -> 10 per 15 min so testing
  // sessions don't trip on a few mistyped passwords or browser-autofill
  // retries; still tight enough to slow brute-force.
  auth: (identifier: string) =>
    checkRateLimit(identifier, 10, 15 * 60 * 1000),

  // Strict — for signup + magic-link sends. Bumped 3 -> 6 per hour for
  // the same reason: a user testing the magic-link flow + a real signup
  // shouldn't blow the bucket.
  signup: (identifier: string) =>
    checkRateLimit(identifier, 6, 60 * 60 * 1000),

  // Moderate - for profile updates
  profileUpdate: (identifier: string) =>
    checkRateLimit(identifier, 20, 60 * 60 * 1000), // 20 updates per hour

  // Lenient - for score submissions
  scoreSubmit: (identifier: string) =>
    checkRateLimit(identifier, 50, 60 * 1000), // 50 submissions per minute

  // Lenient - for general API
  api: (identifier: string) =>
    checkRateLimit(identifier, 100, 60 * 1000), // 100 requests per minute

  // Very lenient - for public endpoints
  public: (identifier: string) =>
    checkRateLimit(identifier, 300, 60 * 1000), // 300 requests per minute
};

/**
 * Reset rate limit for an identifier (useful for successful actions)
 */
export function resetRateLimit(identifier: string): void {
  attempts.delete(identifier);
}

/**
 * Reset every bucket whose identifier starts with `prefix`. Used by the
 * admin clear-rate-limit endpoint so we can wipe all (email, IP,
 * userAgent) tuples for a given email in one shot. Returns how many
 * buckets were cleared.
 */
export function resetRateLimitByPrefix(prefix: string): number {
  let cleared = 0;
  for (const key of attempts.keys()) {
    if (key.startsWith(prefix)) {
      attempts.delete(key);
      cleared++;
    }
  }
  return cleared;
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(identifier: string): RateLimitResult | null {
  const entry = attempts.get(identifier);
  if (!entry) return null;

  const now = Date.now();
  if (now > entry.resetAt) {
    attempts.delete(identifier);
    return null;
  }

  return {
    allowed: entry.count <= 5, // Assuming default maxAttempts
    remainingAttempts: Math.max(0, 5 - entry.count),
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000)
  };
}
