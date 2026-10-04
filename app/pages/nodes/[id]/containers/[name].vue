<script setup lang="ts">
const route = useRoute()
const nodeId = route.params.id as string
const name = route.params.name as string

const { data: node } = await useFetch(`/api/nodes/${nodeId}`)
const { data: loaded } = await useFetch<{ name: string; config: any }>(
  `/api/nodes/${nodeId}/containers/${name}`,
)
if (!loaded.value) throw createError({ statusCode: 404, statusMessage: 'not found' })

useHead({ title: computed(() => `Nodes / ${node.value?.name || nodeId} / Containers / ${name}`) })

const form = configToForm(loaded.value.config)
const error = ref('')
const saving = ref(false)
const busy = ref('')
const state = ref<any>(null)
const logs = ref('')
const ip = ref('')
const stats = ref<any>(null)
const validTabs = ['overview', 'logs', 'config']
const initialTab = validTabs.includes(route.query.tab as string) ? (route.query.tab as string) : 'overview'
const tab = ref(initialTab)

async function refreshState() {
  try {
    state.value = await $fetch(`/api/nodes/${nodeId}/containers/${name}/state`)
  } catch {
    state.value = null
  }
}

async function saveConfig() {
  error.value = ''
  saving.value = true
  try {
    await $fetch(`/api/nodes/${nodeId}/containers/${name}`, {
      method: 'PUT',
      body: formToConfig(form),
    })
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to save'
  } finally {
    saving.value = false
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Docker settles container state async, so poll a few times after an action
 * instead of trusting a single refresh right after the call returns. */
async function refreshStateBurst() {
  for (const delay of [0, 1000, 2000, 4000]) {
    if (delay) await sleep(delay)
    await (tab.value === 'overview' ? refreshOverview() : refreshState())
  }
}

async function runAction(action: string, fn: () => Promise<any>) {
  error.value = ''
  busy.value = action
  try {
    await fn()
    await refreshStateBurst()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || `${action} failed`
  } finally {
    busy.value = ''
  }
}

const deploy = () =>
  runAction('deploy', () => $fetch(`/api/nodes/${nodeId}/containers/${name}/deploy`, { method: 'POST' }))
const update = () =>
  runAction('update', () => $fetch(`/api/nodes/${nodeId}/containers/${name}/update`, { method: 'POST' }))
async function destroy() {
  if (!confirm(`Destroy "${name}"? This stops it, removes it, removes its volumes, and deletes its config.`)) return
  error.value = ''
  busy.value = 'destroy'
  try {
    await $fetch(`/api/nodes/${nodeId}/containers/${name}/destroy`, { method: 'POST' })
    await $fetch(`/api/nodes/${nodeId}/containers/${name}`, { method: 'DELETE' })
    await navigateTo(`/nodes/${nodeId}/containers`)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'destroy failed'
  } finally {
    busy.value = ''
  }
}
const lifecycle = (a: string) => {
  if (a === 'reset' && !confirm(`Reset "${name}"? This wipes its volume contents and restarts it.`)) return
  return runAction(a, () => $fetch(`/api/nodes/${nodeId}/containers/${name}/${a}`, { method: 'POST' }))
}

async function loadLogs() {
  try {
    const res = await $fetch<{ logs: string }>(`/api/nodes/${nodeId}/containers/${name}/logs`, {
      query: { tail: 200 },
    })
    logs.value = res.logs
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to fetch logs'
  }
}

async function loadIp() {
  try {
    const res = await $fetch<{ ip: string }>(`/api/nodes/${nodeId}/containers/${name}/ip`)
    ip.value = res.ip
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to fetch IP'
  }
}

async function loadStats() {
  try {
    stats.value = await $fetch(`/api/nodes/${nodeId}/containers/${name}/stats`)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to fetch stats'
  }
}

async function refreshOverview() {
  await refreshState()
  if (state.value?.running) {
    await Promise.all([loadIp(), loadStats()])
  } else {
    ip.value = ''
    stats.value = null
  }
}
await refreshOverview()
if (initialTab === 'logs') await loadLogs()

function fmtDate(v: string) {
  if (!v || v.startsWith('0001-01-01')) return '—'
  return new Date(v).toLocaleString()
}

const overviewPoll = ref(0)
const logsPoll = ref(0)
let overviewTimer: ReturnType<typeof setInterval> | null = null
let logsTimer: ReturnType<typeof setInterval> | null = null

watch([overviewPoll, tab], ([seconds, activeTab]) => {
  if (overviewTimer) clearInterval(overviewTimer)
  overviewTimer = activeTab === 'overview' && seconds > 0 ? setInterval(refreshOverview, seconds * 1000) : null
})
watch([logsPoll, tab], ([seconds, activeTab]) => {
  if (logsTimer) clearInterval(logsTimer)
  logsTimer = activeTab === 'logs' && seconds > 0 ? setInterval(loadLogs, seconds * 1000) : null
})
onUnmounted(() => {
  if (overviewTimer) clearInterval(overviewTimer)
  if (logsTimer) clearInterval(logsTimer)
})
</script>

<template>
  <AppShell :node-id="nodeId" :node-name="node?.name">
    <template #breadcrumb>
      <NuxtLink to="/">Nodes</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}`">{{ node?.name || nodeId }}</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}/containers`">Containers</NuxtLink> / {{ name }}
    </template>

      <div class="row">
        <h2>{{ name }}</h2>
        <span v-if="state" class="badge" :class="state.status">{{ state.status }}</span>
        <span v-else class="badge">not deployed</span>
      </div>

      <div class="card actions-bar">
        <button class="icon-btn tone-accent solid" :disabled="!!busy" @click="deploy">
          <IconRocket /> {{ busy === 'deploy' ? 'Deploying…' : 'Deploy' }}
        </button>
        <button class="icon-btn tone-blue" :disabled="!!busy" @click="update">
          <IconRefreshCw /> Update
        </button>
        <button class="icon-btn tone-green" :disabled="!!busy" @click="lifecycle('start')">
          <IconPlay /> Start
        </button>
        <button class="icon-btn tone-red" :disabled="!!busy" @click="lifecycle('stop')">
          <IconSquare /> Stop
        </button>
        <button class="icon-btn tone-blue" :disabled="!!busy" @click="lifecycle('restart')">
          <IconRotate /> Restart
        </button>
        <button class="icon-btn tone-amber" :disabled="!!busy" @click="lifecycle('pause')">
          <IconPause /> Pause
        </button>
        <button class="icon-btn tone-amber" :disabled="!!busy" @click="lifecycle('unpause')">
          <IconPlay /> Unpause
        </button>
        <button class="icon-btn tone-amber" :disabled="!!busy" @click="lifecycle('reset')">
          <IconRotateCcw /> Reset
        </button>
        <button class="icon-btn tone-red solid" :disabled="!!busy" @click="destroy">
          <IconTrash /> Destroy
        </button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'overview' }" @click="tab = 'overview'">Overview</button>
        <button class="tab" :class="{ active: tab === 'logs' }" @click="tab = 'logs'; loadLogs()">Logs</button>
        <button class="tab" :class="{ active: tab === 'config' }" @click="tab = 'config'">Config</button>
      </div>

      <div v-if="tab === 'overview'" class="card overview">
        <div class="poll-row">
          <label class="poll-label">
            Auto-refresh
            <select v-model.number="overviewPoll">
              <option :value="0">Off</option>
              <option :value="10">10s</option>
              <option :value="30">30s</option>
              <option :value="60">60s</option>
            </select>
          </label>
        </div>
        <div class="overview-grid">
          <div class="field"><span class="hint">Image</span>{{ form.image || '—' }}</div>
          <div class="field"><span class="hint">Status</span>{{ state?.status || 'not deployed' }}</div>
          <div class="field"><span class="hint">Restart policy</span>{{ form.restart || '—' }}</div>
          <div class="field"><span class="hint">IP address</span>{{ ip || '—' }}</div>
          <div class="field"><span class="hint">Started</span>{{ fmtDate(state?.started_at) }}</div>
          <div class="field"><span class="hint">Finished</span>{{ fmtDate(state?.finished_at) }}</div>
          <div class="field"><span class="hint">Command</span>{{ form.command || '—' }}</div>
          <div class="field"><span class="hint">Ports</span>
            <span v-if="form.ports.length">
              <span v-for="(p, i) in form.ports" :key="i">{{ p.host }}:{{ p.container }}/{{ p.protocol }}<span v-if="i < form.ports.length - 1">, </span></span>
            </span>
            <span v-else>—</span>
          </div>
          <div class="field"><span class="hint">Networks</span>{{ form.networks || '—' }}</div>
          <div class="field" v-if="state && state.status === 'exited'"><span class="hint">Exit code</span>{{ state.exit_code }}</div>
          <div class="field" v-if="state?.health"><span class="hint">Health</span>{{ state.health.status }}</div>
          <div class="field" v-if="state?.error"><span class="hint">Error</span>{{ state.error }}</div>
        </div>

        <div v-if="stats" class="stats-grid">
          <div class="stat-card">
            <span class="hint">CPU</span>
            <strong>{{ stats.cpu_usage_percent?.toFixed(1) }}%</strong>
          </div>
          <div class="stat-card">
            <span class="hint">Memory</span>
            <strong>{{ (stats.mem_usage_bytes / 1024 / 1024).toFixed(0) }} / {{ (stats.mem_limit_bytes / 1024 / 1024).toFixed(0) }} MB</strong>
          </div>
          <div class="stat-card">
            <span class="hint">Net RX</span>
            <strong>{{ (stats.network_rx_bytes / 1024 / 1024).toFixed(2) }} MB</strong>
          </div>
          <div class="stat-card">
            <span class="hint">Net TX</span>
            <strong>{{ (stats.network_tx_bytes / 1024 / 1024).toFixed(2) }} MB</strong>
          </div>
        </div>
      </div>

      <div v-else-if="tab === 'logs'" class="card">
        <div class="poll-row">
          <label class="poll-label">
            Auto-refresh
            <select v-model.number="logsPoll">
              <option :value="0">Off</option>
              <option :value="10">10s</option>
              <option :value="30">30s</option>
              <option :value="60">60s</option>
            </select>
          </label>
        </div>
        <pre class="logs">{{ logs || '(empty)' }}</pre>
      </div>

      <form v-else-if="tab === 'config'" class="card" @submit.prevent="saveConfig">
        <h3>Config</h3>
        <ContainerConfigForm v-model="form" lock-image />
        <div class="save-row">
          <button class="primary" type="submit" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save config' }}
          </button>
        </div>
      </form>
  </AppShell>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.row h2 {
  margin: 0;
}
.actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.error {
  color: var(--danger);
}
.logs {
  white-space: pre-wrap;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  max-height: 400px;
  overflow: auto;
  margin-bottom: 16px;
  background: #1b1e27;
  color: #d8dae0;
}
.save-row {
  margin-top: 20px;
  display: flex;
  gap: 8px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.hint {
  color: var(--text-muted);
  font-size: 12px;
  display: block;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
}
.icon-btn.tone-accent { border-color: var(--accent); color: var(--accent); }
.icon-btn.tone-accent:hover { background: var(--accent); color: #fff; }
.icon-btn.tone-green { border-color: var(--success); color: var(--success); }
.icon-btn.tone-green:hover { background: var(--success); color: #fff; }
.icon-btn.tone-red { border-color: var(--danger); color: var(--danger); }
.icon-btn.tone-red:hover { background: var(--danger); color: #fff; }
.icon-btn.tone-blue { border-color: #2563eb; color: #2563eb; }
.icon-btn.tone-blue:hover { background: #2563eb; color: #fff; }
.icon-btn.tone-amber { border-color: var(--warning); color: var(--warning); }
.icon-btn.tone-amber:hover { background: var(--warning); color: #fff; }
.icon-btn.solid {
  color: #fff;
}
.icon-btn.tone-accent.solid { background: var(--accent); }
.icon-btn.tone-accent.solid:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
.icon-btn.tone-red.solid { background: var(--danger); }
.icon-btn.tone-red.solid:hover { background: #b91c1c; border-color: #b91c1c; }

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}
.tab {
  background: none;
  border: none;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  padding: 8px 14px;
  color: var(--text-muted);
  font-weight: 500;
}
.tab:hover {
  color: var(--accent);
  border-color: transparent;
}
.tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.poll-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.poll-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.poll-label select {
  padding: 4px 8px;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  word-break: break-word;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--neutral-bg);
  border-radius: 8px;
  padding: 12px 14px;
}
.stat-card strong {
  font-size: 18px;
}
</style>
