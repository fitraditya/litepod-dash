// Failed-login limiter shared through app storage (local disk or S3), so the limit holds across
// serverless instances and restarts. One small object per client IP; concurrent failures from
// different instances can race on the same object and under-count slightly, which is fine for
// a brute-force brake.
import { createHash } from 'node:crypto'
import type { Storage } from './storage'

export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60 * 1000

export interface ThrottleEntry {
  count: number
  resetAt: number
}

/** Seconds until the client may try again, or 0 if not locked out. */
export function lockoutSeconds(entry: ThrottleEntry | null, now: number): number {
  if (!entry || entry.resetAt < now) return 0
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - now) / 1000) : 0
}

export function nextFailure(entry: ThrottleEntry | null, now: number): ThrottleEntry {
  if (!entry || entry.resetAt < now) return { count: 1, resetAt: now + WINDOW_MS }
  return { count: entry.count + 1, resetAt: entry.resetAt }
}

const keyFor = (ip: string) => `.throttle/${createHash('sha256').update(ip).digest('hex').slice(0, 32)}.json`

async function load(storage: Storage, ip: string): Promise<ThrottleEntry | null> {
  const raw = await storage.read(keyFor(ip))
  if (!raw) return null
  try {
    const e = JSON.parse(raw)
    return typeof e?.count === 'number' && typeof e?.resetAt === 'number' ? e : null
  } catch {
    return null
  }
}

export async function loginLockout(storage: Storage, ip: string, now = Date.now()): Promise<number> {
  return lockoutSeconds(await load(storage, ip), now)
}

export async function recordLoginFailure(storage: Storage, ip: string, now = Date.now()) {
  const entry = nextFailure(await load(storage, ip), now)
  await storage.write(keyFor(ip), JSON.stringify(entry))
}

export async function clearLoginFailures(storage: Storage, ip: string) {
  await storage.remove(keyFor(ip))
}

export async function assertLoginAllowed(ip: string) {
  const retry = await loginLockout(useAppStorage(), ip)
  if (retry > 0) {
    throw createError({
      statusCode: 429,
      statusMessage: 'too many failed login attempts',
      data: { retryAfterSeconds: retry },
    })
  }
}
