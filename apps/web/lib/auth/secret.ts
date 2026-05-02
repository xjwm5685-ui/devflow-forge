// Shared session secret - generated once per process lifetime
// Used by both middleware.ts and session.ts to ensure consistency

let _secret: Uint8Array | null = null

const DEV_FALLBACK_SECRET = "devflow-forge-dev-secret-do-not-use-in-production-32ch"

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

  _secret = new TextEncoder().encode(DEV_FALLBACK_SECRET)
  console.warn(
    `[Auth] SESSION_SECRET not set. Using deterministic dev secret. ` +
    `Set SESSION_SECRET in .env.local for production.`
  )
  return _secret
}
