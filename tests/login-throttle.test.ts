import { describe, expect, it } from 'vitest'
import {
  clearLoginFailures,
  loginLockout,
  lockoutSeconds,
  nextFailure,
  recordLoginFailure,
  WINDOW_MS,
} from '../server/utils/login-throttle'

function memStorage() {
  const m = new Map<string, string>()
  return {
    read: async (k: string) => m.get(k) ?? null,
    write: async (k: string, v: string) => void m.set(k, v),
    remove: async (k: string) => void m.delete(k),
    list: async () => [...m.keys()],
  }
}

describe('throttle math', () => {
  it('counts within the window and resets after it', () => {
    let e = nextFailure(null, 0)
    for (let i = 0; i < 4; i++) e = nextFailure(e, 1)
    expect(e.count).toBe(5)
    expect(lockoutSeconds(e, 1000)).toBeGreaterThan(0)
    expect(lockoutSeconds(e, WINDOW_MS + 1)).toBe(0)
    expect(nextFailure(e, WINDOW_MS + 1).count).toBe(1)
  })
})

describe('storage-backed throttle', () => {
  it('locks after 5 failures, per IP, shared through storage', async () => {
    const storage = memStorage()
    for (let i = 0; i < 4; i++) await recordLoginFailure(storage, '1.1.1.1', 0)
    expect(await loginLockout(storage, '1.1.1.1', 0)).toBe(0)
    await recordLoginFailure(storage, '1.1.1.1', 0)
    expect(await loginLockout(storage, '1.1.1.1', 1000)).toBeGreaterThan(0)
    expect(await loginLockout(storage, '2.2.2.2', 1000)).toBe(0)
    // a second "instance" sharing the same storage sees the lockout
    expect(await loginLockout(storage, '1.1.1.1', 2000)).toBeGreaterThan(0)
  })
  it('clears on success and ignores corrupt entries', async () => {
    const storage = memStorage()
    for (let i = 0; i < 5; i++) await recordLoginFailure(storage, '1.1.1.1', 0)
    await clearLoginFailures(storage, '1.1.1.1')
    expect(await loginLockout(storage, '1.1.1.1', 1)).toBe(0)
    await storage.write([...(await storage.list())][0] ?? '.throttle/x.json', 'not json')
    expect(await loginLockout(storage, '9.9.9.9', 1)).toBe(0)
  })
})
