// Shared session secret - generated once per process lifetime
// Used by both middleware.ts and session.ts to ensure consistency

let _secret: Uint8Array | null = null

export function getSessionSecret(): Uint8Array {
  if (_secret) return _secret

  const envSecret = process.env.SESSION_SECRET
  if (envSecret) {
    _secret = new TextEncoder().encode(envSecret)
    return _secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: SESSION_SECRET is not set. Refusing to start in production without it.")
  }

  // Dev: stable per process, warn once
  const fallback = crypto.randomUUID()
  _secret = new TextEncoder().encode(fallback)
  console.warn(
    `[Auth] SESSION_SECRET not set. Using random dev secret (stable for this process). ` +
    `Sessions will not persist across restarts. Set SESSION_SECRET in .env.local to fix.`
  )
  return _secret
}
