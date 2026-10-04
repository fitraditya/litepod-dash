import { parse, stringify } from 'yaml'

/** docker-compose-flavored config for a single container, stored as <node_id>/<name>.yaml.
 *  Field set mirrors litepod's DeployPayload (../litepod/docs/swagger.yaml) 1:1 so every
 *  agent capability is reachable from a YAML file. */
export interface ContainerConfig {
  image: string
  restart?: string // e.g. "no", "always", "unless-stopped", "on-failure"
  command?: string[]
  entrypoint?: string[]
  user?: string // uid, name, or "user:group"
  working_dir?: string
  env?: Record<string, string>
  labels?: Record<string, string>

  // resources
  memory_limit?: number // bytes
  memory_reservation?: number // bytes
  cpu_limit?: number // cores
  pids_limit?: number
  shm_size?: number // bytes
  ulimits?: Array<{ name: string; soft: number; hard: number }>

  // storage
  volumes?: Array<{
    type?: 'docker' | 'host'
    name?: string
    host_path?: string
    path: string
    read_only?: boolean
  }>
  tmpfs?: Record<string, string> // container path -> mount options, e.g. "size=64m"
  read_only?: boolean // read-only root filesystem

  // networking
  networks?: string[]
  ports?: Array<{ host: number; container: number; protocol?: string }>
  dns?: string[]
  dns_search?: string[]
  extra_hosts?: string[] // "host:ip" form

  // lifecycle
  stop_signal?: string
  stop_grace_period?: number // seconds
  healthcheck?: {
    test: string[]
    interval_seconds?: number
    timeout_seconds?: number
    retries?: number
  }
  logging?: {
    driver: string
    options?: Record<string, string>
  }

  // hardening
  cap_drop?: string[]
  security_opt?: string[]
  sysctls?: Record<string, string>
}

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

function assertValidName(name: string) {
  if (!NAME_RE.test(name)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid container name' })
  }
}

function assertValidNodeId(nodeId: string) {
  if (!NAME_RE.test(nodeId)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid node id' })
  }
}

export async function listContainerConfigs(nodeId: string): Promise<string[]> {
  assertValidNodeId(nodeId)
  const storage = useAppStorage()
  const keys = await storage.list(nodeId)
  return keys
    .filter((k) => k.endsWith('.yaml') || k.endsWith('.yml'))
    .map((k) => k.split('/').pop()!.replace(/\.ya?ml$/, ''))
}

export async function getContainerConfig(
  nodeId: string,
  name: string,
): Promise<ContainerConfig | null> {
  assertValidNodeId(nodeId)
  assertValidName(name)
  const storage = useAppStorage()
  const raw = await storage.read(`${nodeId}/${name}.yaml`)
  if (!raw) return null
  return parse(raw) as ContainerConfig
}

export async function saveContainerConfig(nodeId: string, name: string, config: ContainerConfig) {
  assertValidNodeId(nodeId)
  assertValidName(name)
  const storage = useAppStorage()
  await storage.write(`${nodeId}/${name}.yaml`, stringify(config))
}

export async function deleteContainerConfig(nodeId: string, name: string) {
  assertValidNodeId(nodeId)
  assertValidName(name)
  const storage = useAppStorage()
  await storage.remove(`${nodeId}/${name}.yaml`)
}
