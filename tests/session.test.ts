import { describe, expect, it } from 'vitest'
import { createSessionToken, parseSessionToken } from '../server/utils/session-core'

const secret = 'a'.repeat(40)

describe('session token', () => {
  it('round-trips a valid token', () => {
    const t = createSessionToken('admin', secret, 60)
    expect(parseSessionToken(t, secret)?.user).toBe('admin')
  })
  it('rejects a wrong secret and tampered payloads', () => {
    const t = createSessionToken('admin', secret, 60)
    expect(parseSessionToken(t, 'b'.repeat(40))).toBeNull()
    const [, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ user: 'root', iat: 0, exp: Date.now() + 1e9 })).toString('base64url')
    expect(parseSessionToken(`${forged}.${sig}`, secret)).toBeNull()
  })
  it('rejects expired tokens', () => {
    const t = createSessionToken('admin', secret, 60, 1_000)
    expect(parseSessionToken(t, secret, 0, 1_000 + 61_000)).toBeNull()
  })
  it('rejects tokens issued before the revocation time', () => {
    const t = createSessionToken('admin', secret, 3600, 5_000)
    expect(parseSessionToken(t, secret, 6_000, 7_000)).toBeNull()
    expect(parseSessionToken(t, secret, 5_000, 7_000)).not.toBeNull()
  })
  it('rejects empty secret / missing token', () => {
    expect(parseSessionToken(undefined, secret)).toBeNull()
    expect(parseSessionToken(createSessionToken('a', '', 60), '')).toBeNull()
  })
})
