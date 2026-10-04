<script setup lang="ts">
interface NodeRow {
  id: string
  name: string
  ip: string
  port?: number
  tls?: boolean
}

const { data: nodes, refresh } = await useFetch<NodeRow[]>('/api/nodes')

useHead({ title: 'Nodes' })

const showAdd = ref(false)
const form = reactive({ id: '', name: '', ip: '', port: 8080, api_key: '', tls: false })
const saving = ref(false)
const error = ref('')
const health = reactive<Record<string, 'checking' | 'online' | 'offline'>>({})
const query = ref('')

const filteredNodes = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return nodes.value || []
  return (nodes.value || []).filter(
    (n) => n.name?.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.ip.includes(q),
  )
})

const onlineCount = computed(() => Object.values(health).filter((s) => s === 'online').length)

async function checkHealth(id: string) {
  health[id] = 'checking'
  try {
    const res = await $fetch<{ status?: string }>(`/api/nodes/${id}/health`)
    health[id] = res.status === 'online' ? 'online' : 'offline'
  } catch {
    health[id] = 'offline'
  }
}

watch(
  nodes,
  (list) => {
    for (const n of list || []) checkHealth(n.id)
  },
  { immediate: true },
)

async function addNode() {
  error.value = ''
  saving.value = true
  try {
    await $fetch('/api/nodes', { method: 'POST', body: { ...form } })
    showAdd.value = false
    Object.assign(form, { id: '', name: '', ip: '', port: 8080, api_key: '', tls: false })
    await refresh()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to add node'
  } finally {
    saving.value = false
  }
}

async function removeNode(id: string) {
  if (!confirm(`Delete node "${id}"? This does not touch running containers.`)) return
  await $fetch(`/api/nodes/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <AppShell>
    <template #breadcrumb>Nodes</template>

    <div class="row">
      <div>
        <h2>Home</h2>
        <p class="subtitle">
          {{ nodes?.length || 0 }} node{{ nodes?.length === 1 ? '' : 's' }} ·
          <span class="online-dot" /> {{ onlineCount }} online
        </p>
      </div>
      <button class="primary" @click="showAdd = !showAdd">
        {{ showAdd ? 'Cancel' : '+ Add node' }}
      </button>
    </div>

    <form v-if="showAdd" class="card add-form" @submit.prevent="addNode">
      <div class="grid">
        <label>Node ID<input v-model="form.id" required placeholder="node-jakarta-01" /></label>
        <label>Name<input v-model="form.name" placeholder="Jakarta 01" /></label>
        <label>IP / host<input v-model="form.ip" required placeholder="203.0.113.5 or https://agent.example.com:8443" /></label>
        <label>Port<input v-model.number="form.port" type="number" /></label>
        <label>API key<input v-model="form.api_key" required /></label>
        <label class="checkbox"><input v-model="form.tls" type="checkbox" /> TLS (self-signed certs accepted)</label>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" type="submit" :disabled="saving">Save node</button>
    </form>

    <div v-if="nodes?.length" class="search-bar">
      <IconSearch />
      <input v-model="query" placeholder="Search nodes by name, ID or IP…" />
    </div>

    <div v-if="filteredNodes.length" class="node-grid">
      <div v-for="n in filteredNodes" :key="n.id" class="card node-card">
        <div class="node-card-top">
          <div class="node-icon" :class="health[n.id]">
            <IconServer />
          </div>
          <div class="node-heading">
            <NuxtLink :to="`/nodes/${n.id}`" class="node-name">{{ n.name || n.id }}</NuxtLink>
            <div class="node-id">{{ n.id }}</div>
          </div>
          <span
            class="badge"
            :class="health[n.id] === 'online' ? 'running' : health[n.id] === 'checking' ? '' : 'exited'"
          >
            {{ health[n.id] === 'checking' ? 'checking…' : health[n.id] === 'online' ? 'online' : 'offline' }}
          </span>
        </div>
        <div class="node-addr">{{ n.ip }}:{{ n.port }}<span v-if="n.tls"> · TLS</span></div>
        <div class="node-card-actions">
          <NuxtLink :to="`/nodes/${n.id}`"><button>Manage</button></NuxtLink>
          <button class="danger" @click="removeNode(n.id)">Delete</button>
        </div>
      </div>
    </div>
    <p v-else-if="nodes?.length" class="empty">No nodes match "{{ query }}".</p>
    <p v-else class="empty">No nodes yet. Add one to get started.</p>
  </AppShell>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
h2 {
  margin: 0;
}
.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.online-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  display: inline-block;
}
.add-form {
  margin-bottom: 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  max-width: 360px;
  color: var(--text-muted);
}
.search-bar input {
  border: none;
  padding: 0;
  flex: 1;
}
.search-bar input:focus {
  outline: none;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.error {
  color: var(--danger);
}
.empty {
  color: var(--text-muted);
}
.node-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.node-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.node-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}
.node-icon {
  flex: none;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--neutral-bg);
  color: var(--text-muted);
}
.node-icon.online {
  background: var(--success-bg);
  color: var(--success);
}
.node-icon.offline {
  background: var(--danger-bg);
  color: var(--danger);
}
.node-heading {
  flex: 1;
  min-width: 0;
}
.node-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text);
  display: block;
}
.node-id {
  font-size: 12px;
  color: var(--text-muted);
  font-family: ui-monospace, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node-addr {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.node-card-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}
</style>
