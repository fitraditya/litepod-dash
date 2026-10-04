export interface PortRow {
  host: number | null
  container: number | null
  protocol: string
}
export interface VolumeRow {
  type: 'docker' | 'host'
  name: string
  host_path: string
  path: string
  read_only: boolean
}
export interface KVRow {
  key: string
  value: string
}
export interface UlimitRow {
  name: string
  soft: number | null
  hard: number | null
}
export interface TmpfsRow {
  path: string
  options: string
}

export function emptyForm() {
  return reactive({
    image: '',
    restart: 'unless-stopped',
    command: '',
    entrypoint: '',
    user: '',
    working_dir: '',
    env: [] as KVRow[],
    labels: [] as KVRow[],

    memory_limit_mb: null as number | null,
    memory_reservation_mb: null as number | null,
    cpu_limit: null as number | null,
    pids_limit: null as number | null,
    shm_size_mb: null as number | null,
    ulimits: [] as UlimitRow[],

    ports: [] as PortRow[],
    volumes: [] as VolumeRow[],
    tmpfs: [] as TmpfsRow[],
    read_only: false,

    networks: '',
    dns: '',
    dns_search: '',
    extra_hosts: '',

    stop_signal: '',
    stop_grace_period: null as number | null,
    healthcheck_test: '',
    healthcheck_interval: null as number | null,
    healthcheck_timeout: null as number | null,
    healthcheck_retries: null as number | null,
    logging_driver: '',
    logging_options: [] as KVRow[],

    cap_drop: '',
    security_opt: '',
    sysctls: [] as KVRow[],
  })
}

function rowsToMap(rows: KVRow[]) {
  const map: Record<string, string> = {}
  for (const row of rows) {
    if (row.key) map[row.key] = row.value
  }
  return Object.keys(map).length ? map : undefined
}

function mapToRows(map: Record<string, string> | undefined) {
  return Object.entries(map || {}).map(([key, value]) => ({ key, value: value as string }))
}

function csvToList(csv: string) {
  const list = csv.split(',').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : undefined
}

/** Convert form state -> ContainerConfig ready to POST/PUT to the server. */
export function formToConfig(form: ReturnType<typeof emptyForm>) {
  // Docker/litepod healthcheck `test` is ['CMD-SHELL', '<whole shell string>'] — the shell
  // command must stay one element, whereas ['CMD', ...args] is exec-form and split per arg.
  const hcTokens = form.healthcheck_test.trim().split(/\s+/).filter(Boolean)
  const healthcheckTest =
    hcTokens[0] === 'CMD-SHELL' && hcTokens.length > 2
      ? ['CMD-SHELL', form.healthcheck_test.trim().replace(/^CMD-SHELL\s+/, '')]
      : hcTokens

  return {
    image: form.image,
    restart: form.restart || undefined,
    command: form.command ? splitShellWords(form.command) : undefined,
    entrypoint: form.entrypoint ? splitShellWords(form.entrypoint) : undefined,
    user: form.user || undefined,
    working_dir: form.working_dir || undefined,
    env: rowsToMap(form.env),
    labels: rowsToMap(form.labels),

    memory_limit: form.memory_limit_mb ? form.memory_limit_mb * 1024 * 1024 : undefined,
    memory_reservation: form.memory_reservation_mb
      ? form.memory_reservation_mb * 1024 * 1024
      : undefined,
    cpu_limit: form.cpu_limit || undefined,
    pids_limit: form.pids_limit || undefined,
    shm_size: form.shm_size_mb ? form.shm_size_mb * 1024 * 1024 : undefined,
    ulimits: form.ulimits.length
      ? form.ulimits
          .filter((u) => u.name)
          .map((u) => ({ name: u.name, soft: u.soft ?? 0, hard: u.hard ?? 0 }))
      : undefined,

    ports: form.ports.length
      ? form.ports
          .filter((p) => p.host && p.container)
          .map((p) => ({ host: p.host!, container: p.container!, protocol: p.protocol || 'tcp' }))
      : undefined,
    volumes: form.volumes.length
      ? form.volumes
          .filter((v) => v.path)
          .map((v) => ({
            type: v.type,
            name: v.type === 'docker' ? v.name : undefined,
            host_path: v.type === 'host' ? v.host_path : undefined,
            path: v.path,
            read_only: v.read_only,
          }))
      : undefined,
    tmpfs: form.tmpfs.length
      ? Object.fromEntries(form.tmpfs.filter((t) => t.path).map((t) => [t.path, t.options]))
      : undefined,
    read_only: form.read_only || undefined,

    networks: csvToList(form.networks),
    dns: csvToList(form.dns),
    dns_search: csvToList(form.dns_search),
    extra_hosts: csvToList(form.extra_hosts),

    stop_signal: form.stop_signal || undefined,
    stop_grace_period: form.stop_grace_period || undefined,
    healthcheck: healthcheckTest.length
      ? {
          test: healthcheckTest,
          interval_seconds: form.healthcheck_interval || undefined,
          timeout_seconds: form.healthcheck_timeout || undefined,
          retries: form.healthcheck_retries || undefined,
        }
      : undefined,
    logging: form.logging_driver
      ? { driver: form.logging_driver, options: rowsToMap(form.logging_options) }
      : undefined,

    cap_drop: csvToList(form.cap_drop),
    security_opt: csvToList(form.security_opt),
    sysctls: rowsToMap(form.sysctls),
  }
}

/** Convert a loaded ContainerConfig back into form state for editing. */
export function configToForm(config: any) {
  const form = emptyForm()
  form.image = config.image || ''
  form.restart = config.restart || 'unless-stopped'
  form.command = joinShellWords(config.command || [])
  form.entrypoint = joinShellWords(config.entrypoint || [])
  form.user = config.user || ''
  form.working_dir = config.working_dir || ''
  form.env = mapToRows(config.env)
  form.labels = mapToRows(config.labels)

  form.memory_limit_mb = config.memory_limit ? config.memory_limit / 1024 / 1024 : null
  form.memory_reservation_mb = config.memory_reservation
    ? config.memory_reservation / 1024 / 1024
    : null
  form.cpu_limit = config.cpu_limit ?? null
  form.pids_limit = config.pids_limit ?? null
  form.shm_size_mb = config.shm_size ? config.shm_size / 1024 / 1024 : null
  form.ulimits = (config.ulimits || []).map((u: any) => ({
    name: u.name,
    soft: u.soft,
    hard: u.hard,
  }))

  form.ports = (config.ports || []).map((p: any) => ({
    host: p.host,
    container: p.container,
    protocol: p.protocol || 'tcp',
  }))
  form.volumes = (config.volumes || []).map((v: any) => ({
    type: v.type || 'docker',
    name: v.name || '',
    host_path: v.host_path || '',
    path: v.path,
    read_only: !!v.read_only,
  }))
  form.tmpfs = Object.entries(config.tmpfs || {}).map(([path, options]) => ({
    path,
    options: options as string,
  }))
  form.read_only = !!config.read_only

  form.networks = (config.networks || []).join(', ')
  form.dns = (config.dns || []).join(', ')
  form.dns_search = (config.dns_search || []).join(', ')
  form.extra_hosts = (config.extra_hosts || []).join(', ')

  form.stop_signal = config.stop_signal || ''
  form.stop_grace_period = config.stop_grace_period ?? null
  form.healthcheck_test = (config.healthcheck?.test || []).join(' ')
  form.healthcheck_interval = config.healthcheck?.interval_seconds ?? null
  form.healthcheck_timeout = config.healthcheck?.timeout_seconds ?? null
  form.healthcheck_retries = config.healthcheck?.retries ?? null
  form.logging_driver = config.logging?.driver || ''
  form.logging_options = mapToRows(config.logging?.options)

  form.cap_drop = (config.cap_drop || []).join(', ')
  form.security_opt = (config.security_opt || []).join(', ')
  form.sysctls = mapToRows(config.sysctls)

  return form
}
