import crypto from 'crypto'

interface ResetEntry {
  userId: string
  email: string
  expires: number
}

// Module-level store — persists within a server process / Vercel instance.
// For production at scale, replace with a database table.
const store = new Map<string, ResetEntry>()

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

// Sweep expired tokens every 15 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [token, entry] of store.entries()) {
      if (entry.expires < now) store.delete(token)
    }
  }, 15 * 60 * 1000)
}

export function createResetToken(userId: string, email: string): string {
  // Generate 48 hex chars (192 bits of entropy)
  const token = crypto.randomBytes(24).toString('hex')
  store.set(token, { userId, email, expires: Date.now() + TOKEN_TTL_MS })
  return token
}

export function consumeResetToken(token: string): ResetEntry | null {
  const entry = store.get(token)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    store.delete(token)
    return null
  }
  store.delete(token) // single-use
  return entry
}

export function peekResetToken(token: string): ResetEntry | null {
  const entry = store.get(token)
  if (!entry || entry.expires < Date.now()) return null
  return entry
}
