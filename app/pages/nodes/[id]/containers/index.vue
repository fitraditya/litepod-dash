<script setup lang="ts">
const route = useRoute()
const nodeId = route.params.id as string

const { data: node } = await useFetch(`/api/nodes/${nodeId}`)
const { data: configNames, refresh: refreshConfigs } = await useFetch<string[]>(
  `/api/nodes/${nodeId}/containers`,
)
const { data: liveList, refresh: refreshLive } = await useFetch<any[]>(
  `/api/nodes/${nodeId}/live`,
  { default: () => [] },
)

useHead({ title: computed(() => `Nodes / ${node.value?.name || nodeId} / Containers`) })

const search = ref('')
const selected = ref<Set<string>>(new Set())
const bulkBusy = ref('')
const error = ref('')

function liveFor(name: string) {
  return liveList.value?.find((c) => c.Names?.some((n: string) => n.replace(/^\//, '') === name))
}

const filteredNames = computed(() => {
  const names = configNames.value || []
  const q = search.value.trim().toLowerCase()
  if (!q) return names
  return names.filter((n) => n.toLowerCase().includes(q))
})

const allSelected = computed(
  () => filteredNames.value.length > 0 && filteredNames.value.every((n) => selected.value.has(n)),
)

function toggleAll() {
  const next = new Set(selected.value)
  if (allSelected.value) {
    for (const n of filteredNames.value) next.delete(n)
  } else {
    for (const n of filteredNames.value) next.add(n)
  }
  selected.value = next
}

function toggleOne(name: string) {
  const next = new Set(selected.value)
  if (next.has(name)) next.delete(name)
  else next.add(name)
  selected.value = next
}

async function refreshAll() {
  await Promise.all([refreshConfigs(), refreshLive()])
}

async function destroyRow(name: string) {
  const live = !!liveFor(name)
  const msg = live
    ? `Destroy "${name}"? This stops it, removes it, removes its volumes, and deletes its config.`
    : `Delete config "${name}"? It was never deployed.`
  if (!confirm(msg)) return
  error.value = ''
  bulkBusy.value = `destroy:${name}`
  try {
    if (live) {
      await $fetch(`/api/nodes/${nodeId}/containers/${name}/destroy`, { method: 'POST' })
    }
    await $fetch(`/api/nodes/${nodeId}/containers/${name}`, { method: 'DELETE' })
    selected.value.delete(name)
    await refreshAll()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || `destroy failed for ${name}`
  } finally {
    bulkBusy.value = ''
  }
}

async function singleAction(name: string, action: string) {
  error.value = ''
  bulkBusy.value = `${action}:${name}`
  try {
    await $fetch(`/api/nodes/${nodeId}/containers/${name}/${action}`, { method: 'POST' })
    await refreshLive()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || `${action} failed for ${name}`
  } finally {
    bulkBusy.value = ''
  }
}

async function bulkAction(action: string) {
  const names = [...selected.value].filter((n) => liveFor(n))
  if (!names.length) return
  error.value = ''
  bulkBusy.value = action
  try {
    const results = await Promise.allSettled(
      names.map((n) => $fetch(`/api/nodes/${nodeId}/containers/${n}/${action}`, { method: 'POST' })),
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) error.value = `${action} failed for ${failed} of ${names.length} container(s)`
    await refreshLive()
  } finally {
    bulkBusy.value = ''
  }
}
</script>

<template>
  <AppShell :node-id="nodeId" :node-name="node?.name">
    <template #breadcrumb>
      <NuxtLink to="/">Nodes</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}`">{{ node?.name || nodeId }}</NuxtLink> / Containers
    </template>

    <div class="row">
      <h2>Containers</h2>
      <div class="actions">
        <button @click="refreshAll">Refresh</button>
        <NuxtLink :to="`/nodes/${nodeId}/containers/new`"><button class="primary">+ New container</button></NuxtLink>
      </div>
    </div>

    <div v-if="configNames?.length" class="card panel">
      <div class="panel-header">
        <h3>Containers</h3>
        <label class="search-box">
          <IconSearch />
          <input v-model="search" type="text" placeholder="Search…" />
        </label>
      </div>

      <div class="bulk-bar">
        <button
          class="icon-btn tone-green"
          :disabled="!selected.size || !!bulkBusy"
          @click="bulkAction('start')"
        >
          <IconPlay /> Start
        </button>
        <button
          class="icon-btn tone-red"
          :disabled="!selected.size || !!bulkBusy"
          @click="bulkAction('stop')"
        >
          <IconSquare /> Stop
        </button>
        <button
          class="icon-btn tone-red"
          :disabled="!selected.size || !!bulkBusy"
          @click="bulkAction('kill')"
        >
          <IconSquare /> Kill
        </button>
        <button
          class="icon-btn tone-blue"
          :disabled="!selected.size || !!bulkBusy"
          @click="bulkAction('restart')"
        >
          <IconRotate /> Restart
        </button>
        <button
          class="icon-btn tone-amber"
          :disabled="!selected.size || !!bulkBusy"
          @click="bulkAction('pause')"
        >
          <IconPause /> Pause
        </button>
        <button
          class="icon-btn tone-amber"
          :disabled="!selected.size || !!bulkBusy"
          @click="bulkAction('unpause')"
        >
          <IconPlay /> Resume
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <table>
        <thead>
          <tr>
            <th class="col-check"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
            <th>Name</th>
            <th>State</th>
            <th>Status</th>
            <th>Image</th>
            <th>Quick actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="name in filteredNames" :key="name">
            <td class="col-check"><input type="checkbox" :checked="selected.has(name)" @change="toggleOne(name)" /></td>
            <td><NuxtLink :to="`/nodes/${nodeId}/containers/${name}`">{{ name }}</NuxtLink></td>
            <td>
              <span v-if="liveFor(name)" class="badge" :class="liveFor(name).State">{{ liveFor(name).State }}</span>
              <span v-else class="badge">not deployed</span>
            </td>
            <td class="muted">{{ liveFor(name)?.Status || '—' }}</td>
            <td>{{ liveFor(name)?.Image || '—' }}</td>
            <td class="quick-actions">
              <button
                class="icon-btn small tone-green"
                title="Start"
                :disabled="!liveFor(name) || !!bulkBusy"
                @click="singleAction(name, 'start')"
              >
                <IconPlay />
              </button>
              <button
                class="icon-btn small tone-red"
                title="Stop"
                :disabled="!liveFor(name) || !!bulkBusy"
                @click="singleAction(name, 'stop')"
              >
                <IconSquare />
              </button>
              <button
                class="icon-btn small tone-blue"
                title="Restart"
                :disabled="!liveFor(name) || !!bulkBusy"
                @click="singleAction(name, 'restart')"
              >
                <IconRotate />
              </button>
              <NuxtLink :to="`/nodes/${nodeId}/containers/${name}?tab=logs`" title="Logs">
                <button class="icon-btn small tone-blue" type="button"><IconFileText /></button>
              </NuxtLink>
              <button
                class="icon-btn small tone-red"
                title="Destroy"
                :disabled="!!bulkBusy"
                @click="destroyRow(name)"
              >
                <IconTrash />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!filteredNames.length" class="empty">No containers match "{{ search }}".</p>
    </div>
    <p v-else class="empty">No container configs on this node yet.</p>
  </AppShell>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
h2 {
  margin: 0;
}
.actions {
  display: flex;
  gap: 8px;
}
.empty {
  color: var(--text-muted);
}
.panel {
  padding: 0;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.panel-header h3 {
  margin: 0;
  font-size: 15px;
}
.search-box {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text-muted);
}
.search-box input {
  border: none;
  padding: 0;
  outline: none;
  min-width: 180px;
}
.bulk-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 20px;
  background: var(--neutral-bg);
  border-bottom: 1px solid var(--border);
}
table {
  margin: 0;
}
th,
td {
  padding: 12px 20px;
}
.col-check {
  width: 36px;
  padding-right: 0;
}
.muted {
  color: var(--text-muted);
}
.quick-actions {
  display: flex;
  gap: 6px;
}
.error {
  color: var(--danger);
  padding: 0 20px;
  margin: 0 0 12px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
}
.icon-btn.small {
  padding: 6px 8px;
}
.icon-btn.tone-green { border-color: var(--success); color: var(--success); }
.icon-btn.tone-green:hover:not(:disabled) { background: var(--success); color: #fff; }
.icon-btn.tone-red { border-color: var(--danger); color: var(--danger); }
.icon-btn.tone-red:hover:not(:disabled) { background: var(--danger); color: #fff; }
.icon-btn.tone-blue { border-color: #2563eb; color: #2563eb; }
.icon-btn.tone-blue:hover:not(:disabled) { background: #2563eb; color: #fff; }
.icon-btn.tone-amber { border-color: var(--warning); color: var(--warning); }
.icon-btn.tone-amber:hover:not(:disabled) { background: var(--warning); color: #fff; }
</style>
