import type { NodeEntry } from './nodes'
import type { ContainerConfig } from './containers'
import { nodeBaseUrl } from './nodes'

// DeployPayload uses DisallowUnknownFields server-side and rejects zero-value fields for
// some numeric options implicitly via validation, so only send keys that are actually set.
function toDeployRequest(name: string, config: ContainerConfig) {
  const body: Record<string, unknown> = {
    image: config.image,
    name,
    memory_limit: config.memory_limit ?? 0,
    cpu_limit: config.cpu_limit ?? 0,
  }

  if (config.restart) body.restart_policy = config.restart
  if (config.command?.length) body.command = config.command
  if (config.entrypoint?.length) body.entrypoint = config.entrypoint
  if (config.user) body.user = config.user
  if (config.working_dir) body.working_dir = config.working_dir
  if (config.env && Object.keys(config.env).length) body.env = config.env
  if (config.labels && Object.keys(config.labels).length) body.labels = config.labels

  if (config.memory_reservation) body.memory_reservation = config.memory_reservation
  if (config.pids_limit) body.pids_limit = config.pids_limit
  if (config.shm_size) body.shm_size = config.shm_size
  if (config.ulimits?.length) body.ulimits = config.ulimits

  if (config.volumes?.length) {
    body.volumes = config.volumes.map((v) => ({
      type: v.type ?? 'docker',
      volume_name: v.name ?? '',
      host_path: v.host_path ?? '',
      bind_path: v.path,
      read_only: !!v.read_only,
    }))
  }
  if (config.tmpfs && Object.keys(config.tmpfs).length) body.tmpfs = config.tmpfs
  if (config.read_only) body.read_only = config.read_only

  if (config.networks?.length) body.networks = config.networks
  if (config.ports?.length) {
    body.ports = config.ports.map((p) => ({
      host_port: p.host,
      container_port: p.container,
      protocol: p.protocol ?? 'tcp',
    }))
  }
  if (config.dns?.length) body.dns = config.dns
  if (config.dns_search?.length) body.dns_search = config.dns_search
  if (config.extra_hosts?.length) body.extra_hosts = config.extra_hosts

  if (config.stop_signal) body.stop_signal = config.stop_signal
  if (config.stop_grace_period) body.stop_grace_period = config.stop_grace_period
  if (config.healthcheck) {
    body.healthcheck = {
      test: config.healthcheck.test,
      interval_seconds: config.healthcheck.interval_seconds ?? 0,
      timeout_seconds: config.healthcheck.timeout_seconds ?? 0,
      retries: config.healthcheck.retries ?? 0,
    }
  }
  if (config.logging?.driver) body.logging = config.logging

  if (config.cap_drop?.length) body.cap_drop = config.cap_drop
  if (config.security_opt?.length) body.security_opt = config.security_opt
  if (config.sysctls && Object.keys(config.sysctls).length) body.sysctls = config.sysctls

  return body
}

const enc = encodeURIComponent

// Per-request timeouts so a dead agent can't hang the UI: fast for health probes, generous for
// mutating calls (deploy may pull an image synchronously).
const TIMEOUT_HEALTH_MS = 3_000
const TIMEOUT_READ_MS = 15_000
const TIMEOUT_WRITE_MS = 120_000

// The agent rate-limits per client IP (default 20 rps, burst 40) and all dashpod traffic comes
// from one IP, so bulk actions can hit 429. The limiter rejects before the handler runs, which
// makes a retry safe for every method.
const RATE_LIMIT_RETRIES = 3

async function agentFetch(node: NodeEntry, path: string, opts: any = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await agentFetchOnce(node, path, opts)
    } catch (err: any) {
      if (err?.statusCode !== 429 || attempt >= RATE_LIMIT_RETRIES) throw err
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt + Math.random() * 100))
    }
  }
}

async function agentFetchOnce(node: NodeEntry, path: string, opts: any = {}) {
  const url = `${nodeBaseUrl(node)}${path}`
  const method = String(opts.method ?? 'GET').toUpperCase()
  const timeout =
    opts.timeout ??
    (path === '/health' ? TIMEOUT_HEALTH_MS : method === 'GET' || method === 'HEAD' ? TIMEOUT_READ_MS : TIMEOUT_WRITE_MS)
  try {
    const fetcher = node.tls ? httpsFetcher() : $fetch
    return await fetcher(url, {
      ...opts,
      timeout,
      headers: { 'X-API-KEY': node.api_key, ...(opts.headers ?? {}) },
    })
  } catch (err: any) {
    const status: number | undefined = err?.response?.status
    // The agent rejecting our key is not a dashpod session problem: report it as a bad gateway
    // so the browser doesn't mistake a 401 for an expired login.
    if (status === 401 || status === 403) {
      throw createError({ statusCode: 502, statusMessage: `agent rejected the API key (HTTP ${status})` })
    }
    if (!status) {
      const timedOut = err?.name === 'TimeoutError' || /timeout|aborted/i.test(String(err?.message))
      throw createError({
        statusCode: timedOut ? 504 : 502,
        statusMessage: timedOut ? 'agent request timed out' : 'agent unreachable',
      })
    }
    if (status === 429) {
      throw createError({ statusCode: 429, statusMessage: 'agent rate limit exceeded, try again shortly' })
    }
    const message = err?.data?.error || err?.data?.message || err?.message || 'agent request failed'
    // The agent answers 500 for a missing container although its API documents 404.
    if (status === 500 && /no such container/i.test(String(message))) {
      throw createError({ statusCode: 404, statusMessage: 'container not found on node' })
    }
    throw createError({ statusCode: status, statusMessage: message })
  }
}

export const litepod = {
  deploy: (node: NodeEntry, name: string, config: ContainerConfig) =>
    agentFetch(node, '/containers', { method: 'POST', body: toDeployRequest(name, config) }),

  update: (node: NodeEntry, name: string, config: ContainerConfig) =>
    agentFetch(node, `/containers/${enc(name)}`, {
      method: 'PUT',
      body: toDeployRequest(name, config),
    }),

  destroy: (node: NodeEntry, name: string) =>
    agentFetch(node, `/containers/${enc(name)}`, { method: 'DELETE' }),

  list: (node: NodeEntry) => agentFetch(node, '/containers'),

  action: (
    node: NodeEntry,
    name: string,
    action: 'start' | 'stop' | 'restart' | 'reset' | 'pause' | 'unpause' | 'kill' | 'suspend' | 'unsuspend',
    query?: Record<string, string>,
  ) => {
    const qs = query ? `?${new URLSearchParams(query)}` : ''
    return agentFetch(node, `/containers/${enc(name)}/${action}${qs}`, { method: 'POST' })
  },

  stats: (node: NodeEntry, name: string) => agentFetch(node, `/containers/${enc(name)}/stats`),
  state: (node: NodeEntry, name: string) => agentFetch(node, `/containers/${enc(name)}/state`),
  ip: (node: NodeEntry, name: string) => agentFetch(node, `/containers/${enc(name)}/ip`),
  logs: (node: NodeEntry, name: string, tail?: number, timestamps?: boolean) => {
    const params = new URLSearchParams()
    if (tail) params.set('tail', String(tail))
    if (timestamps) params.set('timestamps', 'true')
    const qs = params.toString() ? `?${params}` : ''
    return agentFetch(node, `/containers/${enc(name)}/logs${qs}`)
  },

  health: (node: NodeEntry) => agentFetch(node, '/health'),

  // images
  listImages: (node: NodeEntry) => agentFetch(node, '/images'),
  imageExists: async (node: NodeEntry, name: string) => {
    try {
      await agentFetch(node, `/images?${new URLSearchParams({ name })}`, { method: 'HEAD' })
      return true
    } catch (err: any) {
      if (err.statusCode === 404) return false
      throw err
    }
  },
  pullImage: (node: NodeEntry, image: string) =>
    agentFetch(node, '/images/pull', { method: 'POST', body: { image } }),

  // networks
  listNetworks: (node: NodeEntry) => agentFetch(node, '/networks'),
  createNetwork: (node: NodeEntry, name: string) =>
    agentFetch(node, '/networks', { method: 'POST', body: { name } }),
  deleteNetwork: (node: NodeEntry, name: string) =>
    agentFetch(node, `/networks/${enc(name)}`, { method: 'DELETE' }),

  // volumes
  listVolumes: (node: NodeEntry) => agentFetch(node, '/volumes'),
  createVolume: (node: NodeEntry, name: string) =>
    agentFetch(node, '/volumes', { method: 'POST', body: { name } }),
  deleteVolume: (node: NodeEntry, name: string) =>
    agentFetch(node, `/volumes/${enc(name)}`, { method: 'DELETE' }),
}
