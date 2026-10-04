// Pure session-cookie signing/verification (no Nitro globals) so it can be unit-tested.
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionPayload {
  user: string
  iat: number
  exp: number
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSessionToken(
  user: string,
  secret: string,
  maxAgeSeconds: number,
  now = Date.now(),
): string {
  const payload: SessionPayload = { user, iat: now, exp: now + maxAgeSeconds * 1000 }
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${json}.${sign(json, secret)}`
}

/** Returns the payload if signature + expiry are valid and the session wasn't revoked
 *  (`iat` must be at or after `revokedBefore`). */
export function parseSessionToken(
  token: string | undefined,
  secret: string,
  revokedBefore = 0,
  now = Date.now(),
): SessionPayload | null {
  if (!token || !secret) return null
  const [json, sig] = token.split('.')
  if (!json || !sig) return null
  const a = Buffer.from(sig)
  const b = Buffer.from(sign(json, secret))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(json, 'base64url').toString('utf-8'))
    if (typeof payload.exp !== 'number' || payload.exp < now) return null
    if (typeof payload.iat !== 'number' || payload.iat < revokedBefore) return null
    return payload
  } catch {
    return null
  }
}
