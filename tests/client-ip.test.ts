import { describe, expect, it } from 'vitest'
import { pickClientIp } from '../server/utils/client-ip'

describe('pickClientIp', () => {
  it('ignores X-Forwarded-For when no proxy is trusted', () => {
    expect(pickClientIp('6.6.6.6', '9.9.9.9', 0)).toBe('9.9.9.9')
  })
  it('uses the rightmost entry for one trusted proxy (spoofed prefix ignored)', () => {
    expect(pickClientIp('6.6.6.6, 1.2.3.4', '10.0.0.1', 1)).toBe('1.2.3.4')
  })
  it('handles multiple hops and falls back to the socket', () => {
    expect(pickClientIp('1.1.1.1, 2.2.2.2, 3.3.3.3', 'x', 2)).toBe('2.2.2.2')
    expect(pickClientIp(undefined, '9.9.9.9', 1)).toBe('9.9.9.9')
  })
})
