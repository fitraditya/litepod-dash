// Request-body validation. The `check*` functions are pure (return error strings) so they can
// be unit-tested; the `assert*` wrappers throw a 400 for use in route handlers.
import type { ContainerConfig } from './containers'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr)
const isStrMap = (v: unknown): v is Record<string, string> =>
  isObj(v) && Object.values(v).every(isStr)

const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/
const HOST_RE = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/
const RESTART_POLICIES = ['no', 'always', 'unless-stopped', 'on-failure']

const CONFIG_KEYS = new Set([
  'image', 'restart', 'command', 'entrypoint', 'user', 'working_dir', 'env', 'labels',
  'memory_limit', 'memory_reservation', 'cpu_limit', 'pids_limit', 'shm_size', 'ulimits',
  'volumes', 'tmpfs', 'read_only', 'networks', 'ports', 'dns', 'dns_search', 'extra_hosts',
  'stop_signal', 'stop_grace_period', 'healthcheck', 'logging', 'cap_drop', 'security_opt',
  'sysctls',
])

export function checkContainerConfig(c: unknown): string[] {
  if (!isObj(c)) return ['config must be an object']
  const errs: string[] = []

  for (const k of Object.keys(c)) if (!CONFIG_KEYS.has(k)) errs.push(`unknown field "${k}"`)

  if (!isStr(c.image) || !c.image.trim()) errs.push('image is required')
  if (c.restart !== undefined && !(isStr(c.restart) && RESTART_POLICIES.includes(c.restart))) {
    errs.push(`restart must be one of ${RESTART_POLICIES.join(', ')}`)
  }
  for (const k of ['user', 'working_dir', 'stop_signal'] as const) {
    if (c[k] !== undefined && !isStr(c[k])) errs.push(`${k} must be a string`)
  }
  for (const k of [
    'command', 'entrypoint', 'networks', 'dns', 'dns_search', 'extra_hosts', 'cap_drop',
    'security_opt',
  ] as const) {
    if (c[k] !== undefined && !isStrArray(c[k])) errs.push(`${k} must be a list of strings`)
  }
  for (const k of ['env', 'labels', 'tmpfs', 'sysctls'] as const) {
    if (c[k] !== undefined && !isStrMap(c[k])) errs.push(`${k} must be a map of strings`)
  }
  for (const k of [
    'memory_limit', 'memory_reservation', 'cpu_limit', 'pids_limit', 'shm_size',
    'stop_grace_period',
  ] as const) {
    if (c[k] !== undefined && !(isNum(c[k]) && (c[k] as number) >= 0)) {
      errs.push(`${k} must be a non-negative number`)
    }
  }
  if (c.read_only !== undefined && typeof c.read_only !== 'boolean') errs.push('read_only must be a boolean')
  if (
    isNum(c.memory_reservation) && c.memory_reservation > 0 &&
    isNum(c.memory_limit) && c.memory_reservation > c.memory_limit
  ) {
    errs.push('memory_reservation must not exceed memory_limit')
  }

  if (c.ports !== undefined) {
    if (!Array.isArray(c.ports)) errs.push('ports must be a list')
    else
      c.ports.forEach((p: unknown, i: number) => {
        const port = (n: unknown) => isNum(n) && Number.isInteger(n) && n >= 1 && n <= 65535
        if (!isObj(p) || !port(p.host) || !port(p.container)) errs.push(`ports[${i}]: host and container must be 1-65535`)
        else if (p.protocol !== undefined && p.protocol !== 'tcp' && p.protocol !== 'udp') {
          errs.push(`ports[${i}]: protocol must be tcp or udp`)
        }
      })
  }

  if (c.volumes !== undefined) {
    if (!Array.isArray(c.volumes)) errs.push('volumes must be a list')
    else
      c.volumes.forEach((v: unknown, i: number) => {
        if (!isObj(v) || !isStr(v.path) || !v.path.startsWith('/')) {
          errs.push(`volumes[${i}]: path must be an absolute container path`)
          return
        }
        const type = v.type ?? 'docker'
        if (type === 'docker') {
          if (!isStr(v.name) || !v.name) errs.push(`volumes[${i}]: name is required for docker volumes`)
        } else if (type === 'host') {
          if (!isStr(v.host_path) || !v.host_path.startsWith('/')) {
            errs.push(`volumes[${i}]: host_path must be absolute for host volumes`)
          }
        } else errs.push(`volumes[${i}]: type must be docker or host`)
      })
  }

  if (c.ulimits !== undefined) {
    if (!Array.isArray(c.ulimits)) errs.push('ulimits must be a list')
    else
      c.ulimits.forEach((u: unknown, i: number) => {
        if (!isObj(u) || !isStr(u.name) || !u.name || !isNum(u.soft) || !isNum(u.hard)) {
          errs.push(`ulimits[${i}]: name, soft, hard are required`)
        }
      })
  }

  if (c.healthcheck !== undefined) {
    const h = c.healthcheck
    if (!isObj(h) || !isStrArray(h.test) || h.test.length === 0) errs.push('healthcheck.test must be a non-empty list of strings')
    else
      for (const k of ['interval_seconds', 'timeout_seconds', 'retries']) {
        if (h[k] !== undefined && !(isNum(h[k]) && (h[k] as number) >= 0)) errs.push(`healthcheck.${k} must be a non-negative number`)
      }
  }

  if (c.logging !== undefined) {
    const l = c.logging
    if (!isObj(l) || !isStr(l.driver) || !l.driver) errs.push('logging.driver is required')
    else if (l.options !== undefined && !isStrMap(l.options)) errs.push('logging.options must be a map of strings')
  }

  return errs
}

export interface NodeInput {
  id?: unknown
  name?: unknown
  ip?: unknown
  port?: unknown
  api_key?: unknown
  tls?: unknown
}

/** `partial` = update: every field optional, but any provided field must be valid. */
export function checkNodeInput(n: unknown, partial: boolean): string[] {
  if (!isObj(n)) return ['body must be an object']
  const errs: string[] = []
  const has = (k: string) => n[k] !== undefined && n[k] !== ''

  if (!partial || has('id')) {
    if (!isStr(n.id) || !ID_RE.test(n.id) || n.id.length > 64) errs.push('id must match [a-zA-Z0-9][a-zA-Z0-9_.-]* (max 64)')
  }
  if (!partial || has('ip')) {
    if (!isStr(n.ip) || !HOST_RE.test(n.ip) || n.ip.length > 253) errs.push('ip must be a hostname or IPv4 address')
  }
  if (!partial || has('api_key')) {
    if (!isStr(n.api_key) || !n.api_key || n.api_key.length > 512) errs.push('api_key is required (max 512)')
  }
  if (has('port') && !(isNum(n.port) && Number.isInteger(n.port) && n.port >= 1 && n.port <= 65535)) {
    errs.push('port must be 1-65535')
  }
  if (has('name') && (!isStr(n.name) || n.name.length > 100)) errs.push('name must be a string (max 100)')
  if (n.tls !== undefined && typeof n.tls !== 'boolean') errs.push('tls must be a boolean')
  return errs
}

function fail(errs: string[]): never {
  throw createError({ statusCode: 400, statusMessage: errs.join('; ') })
}

export function assertContainerConfig(c: unknown): ContainerConfig {
  const errs = checkContainerConfig(c)
  if (errs.length) fail(errs)
  return c as ContainerConfig
}

export function assertNodeInput(n: unknown, partial: boolean) {
  const errs = checkNodeInput(n, partial)
  if (errs.length) fail(errs)
  return n as NodeInput
}
