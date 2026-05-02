import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 60
const AUTH_MAX_REQUESTS = 10

function getClientIp(request: NextRequest): string {
  const geo = (request as unknown as { geo?: { ip?: string } }).geo
  if (geo?.ip) return geo.ip

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(first)) return first
  }

  return "unknown"
}

function checkLimit(key: string, maxRequests: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + WINDOW_MS
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  entry.count++
  const remaining = Math.max(0, maxRequests - entry.count)
  return { allowed: entry.count <= maxRequests, remaining, resetAt: entry.resetAt }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 60_000)

export function rateLimit(request: NextRequest, maxRequests = MAX_REQUESTS): NextResponse | null {
  const ip = getClientIp(request)
  const key = `${ip}:${maxRequests}`
  const result = checkLimit(key, maxRequests)

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  return null
}

export function authRateLimit(request: NextRequest): NextResponse | null {
  return rateLimit(request, AUTH_MAX_REQUESTS)
}
