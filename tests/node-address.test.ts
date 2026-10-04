import { describe, expect, it } from 'vitest'
import { parseNodeAddress } from '../server/utils/node-address'

describe('parseNodeAddress', () => {
  it('splits scheme, host and port', () => {
    expect(parseNodeAddress({ ip: 'https://agent.example.com:8443' })).toMatchObject({ ip: 'agent.example.com', port: 8443, tls: true })
    expect(parseNodeAddress({ ip: 'http://10.0.0.5/', port: 8080 })).toMatchObject({ ip: '10.0.0.5', port: 8080, tls: false })
  })
  it('leaves plain hosts and junk alone', () => {
    expect(parseNodeAddress({ ip: '10.0.0.5', tls: true })).toEqual({ ip: '10.0.0.5', tls: true })
    expect(parseNodeAddress({ ip: 'https://evil.com/@x' }).ip).toBe('https://evil.com/@x')
  })
})
