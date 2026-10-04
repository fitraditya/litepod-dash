import { parse, stringify } from 'yaml'

const COOKIE_NAME = 'dashpod_session'
const STATE_KEY = 'session-state.yaml'
const STATE_CACHE_MS = 10_000

function maxAgeSeconds() {
  const hours = Number(appConfig().sessionMaxAgeHours)
  return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 60 * 60
}

// "Sign out everywhere" stores a revoked-before timestamp in storage; any session issued
// earlier is rejected. Cached briefly so each request doesn't hit disk/S3.
let revokedCache: { value: number; at: number } | null = null

async function getRevokedBefore(): Promise<number> {
  if (revokedCache && Date.now() - revokedCache.at < STATE_CACHE_MS) return revokedCache.value
  const raw = await useAppStorage().read(STATE_KEY)
  const value = Number(raw ? parse(raw)?.revoked_before : 0) || 0
  revokedCache = { value, at: Date.now() }
  return value
}

export async function revokeAllSessions() {
  const now = Date.now()
  await useAppStorage().write(STATE_KEY, stringify({ revoked_before: now }))
  revokedCache = { value: now, at: now }
}

// COOKIE_SECURE=true|false forces the flag; otherwise it follows the request protocol
// (honoring X-Forwarded-Proto from a TLS-terminating proxy).
function isSecureRequest(event: any) {
  const forced = appConfig().cookieSecure
  if (forced === 'true') return true
  if (forced === 'false') return false
  return getRequestProtocol(event, { xForwardedProto: true }) === 'https'
}

export function setSessionCookie(event: any, user: string) {
  const age = maxAgeSeconds()
  setCookie(event, COOKIE_NAME, createSessionToken(user, appConfig().sessionSecret, age), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(event),
    maxAge: age,
    path: '/',
  })
}

export function clearSessionCookie(event: any) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export async function getAppSession(event: any): Promise<SessionPayload | null> {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null
  return parseSessionToken(token, appConfig().sessionSecret, await getRevokedBefore())
}
