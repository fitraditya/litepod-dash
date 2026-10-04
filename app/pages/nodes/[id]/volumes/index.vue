<script setup lang="ts">
const route = useRoute()
const nodeId = route.params.id as string
const { data: node } = await useFetch(`/api/nodes/${nodeId}`)

const { data: volumes, refresh } = await useFetch<{ resources: string[] }>(
  `/api/nodes/${nodeId}/volumes`,
  { default: () => ({ resources: [] }) },
)

useHead({ title: computed(() => `Nodes / ${node.value?.name || nodeId} / Volumes`) })

const newName = ref('')
const error = ref('')

async function create() {
  if (!newName.value) return
  error.value = ''
  try {
    await $fetch(`/api/nodes/${nodeId}/volumes`, {
      method: 'POST',
      body: { name: newName.value },
    })
    newName.value = ''
    await refresh()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to create volume'
  }
}

async function remove(name: string) {
  if (!confirm(`Delete volume "${name}"?`)) return
  error.value = ''
  try {
    await $fetch(`/api/nodes/${nodeId}/volumes/${name}`, { method: 'DELETE' })
    await refresh()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to delete volume'
  }
}
</script>

<template>
  <AppShell :node-id="nodeId" :node-name="node?.name">
    <template #breadcrumb>
      <NuxtLink to="/">Nodes</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}`">{{ node?.name || nodeId }}</NuxtLink> / volumes
    </template>

    <div class="row">
      <h2>Volumes</h2>
      <button @click="refresh()">Refresh</button>
    </div>

    <form class="card pull-form" @submit.prevent="create">
      <input v-model="newName" placeholder="new volume name" />
      <button class="primary" type="submit">Create</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>

    <table v-if="volumes?.resources?.length" class="card">
      <thead>
        <tr>
          <th>Name</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="v in volumes.resources" :key="v">
          <td>{{ v }}</td>
          <td class="actions"><button class="danger" @click="remove(v)">Delete</button></td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">No volumes on this node.</p>
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
.pull-form {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.pull-form input {
  flex: 1;
}
.error {
  color: var(--danger);
}
.actions {
  text-align: right;
}
.empty {
  color: var(--text-muted);
}
</style>
