import { describe, expect, it } from 'vitest'
import { checkContainerConfig, checkNodeInput } from '../server/utils/validate'

describe('checkContainerConfig', () => {
  it('accepts a minimal and a full config', () => {
    expect(checkContainerConfig({ image: 'nginx:latest' })).toEqual([])
    expect(
      checkContainerConfig({
        image: 'postgres:16',
        restart: 'unless-stopped',
        memory_limit: 512 * 1024 * 1024,
        memory_reservation: 256 * 1024 * 1024,
        cpu_limit: 0.5,
        ports: [{ host: 5432, container: 5432, protocol: 'tcp' }],
        volumes: [
          { type: 'docker', name: 'pg', path: '/var/lib/postgresql/data' },
          { type: 'host', host_path: '/srv/a', path: '/a', read_only: true },
        ],
        healthcheck: { test: ['CMD-SHELL', 'pg_isready -U postgres'], retries: 3 },
        env: { A: '1' },
      }),
    ).toEqual([])
  })
  it('rejects bad input', () => {
    expect(checkContainerConfig(null)).not.toEqual([])
    expect(checkContainerConfig({})).toContain('image is required')
    expect(checkContainerConfig({ image: 'x', bogus: 1 })).toContain('unknown field "bogus"')
    expect(checkContainerConfig({ image: 'x', restart: 'sometimes' })).not.toEqual([])
    expect(checkContainerConfig({ image: 'x', ports: [{ host: 0, container: 80 }] })).not.toEqual([])
    expect(checkContainerConfig({ image: 'x', env: { A: 1 } })).not.toEqual([])
    expect(checkContainerConfig({ image: 'x', memory_limit: -1 })).not.toEqual([])
    expect(checkContainerConfig({ image: 'x', memory_limit: 10, memory_reservation: 20 })).not.toEqual([])
    expect(checkContainerConfig({ image: 'x', volumes: [{ type: 'host', host_path: 'rel', path: '/a' }] })).not.toEqual([])
    expect(checkContainerConfig({ image: 'x', healthcheck: { test: [] } })).not.toEqual([])
  })
})

describe('checkNodeInput', () => {
  const ok = { id: 'node-1', ip: '10.0.0.5', api_key: 'k', port: 8080 }
  it('accepts valid nodes', () => {
    expect(checkNodeInput(ok, false)).toEqual([])
    expect(checkNodeInput({ ip: 'agent.example.com' }, true)).toEqual([])
  })
  it('rejects URL-injection hosts, bad ids and ports', () => {
    expect(checkNodeInput({ ...ok, ip: 'evil.com/@x' }, false)).not.toEqual([])
    expect(checkNodeInput({ ...ok, id: '../x' }, false)).not.toEqual([])
    expect(checkNodeInput({ ...ok, port: 70000 }, false)).not.toEqual([])
    expect(checkNodeInput({ id: 'a', ip: '1.1.1.1' }, false)).not.toEqual([])
  })
})
