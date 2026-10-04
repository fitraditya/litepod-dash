<script setup lang="ts">
const route = useRoute()
const nodeId = route.params.id as string

const { data: node } = await useFetch(`/api/nodes/${nodeId}`)
const { data: images, refresh } = await useFetch<any[]>(`/api/nodes/${nodeId}/images`, {
  default: () => [],
})

useHead({ title: computed(() => `Nodes / ${node.value?.name || nodeId} / Images`) })

const pullImage = ref('')
const pulling = ref(false)
const error = ref('')

async function pull() {
  if (!pullImage.value) return
  error.value = ''
  pulling.value = true
  try {
    await $fetch(`/api/nodes/${nodeId}/images/pull`, {
      method: 'POST',
      body: { image: pullImage.value },
    })
    pullImage.value = ''
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'pull failed'
  } finally {
    pulling.value = false
  }
}
</script>

<template>
  <AppShell :node-id="nodeId" :node-name="node?.name">
    <template #breadcrumb>
      <NuxtLink to="/">Nodes</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}`">{{ node?.name || nodeId }}</NuxtLink> / images
    </template>

    <div class="row">
      <h2>Images</h2>
      <button @click="refresh()">Refresh</button>
    </div>

    <form class="card pull-form" @submit.prevent="pull">
      <input v-model="pullImage" placeholder="nginx:latest" />
      <button class="primary" type="submit" :disabled="pulling">
        {{ pulling ? 'Pulling…' : 'Pull image' }}
      </button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <p class="hint">Pull runs in the background on the agent; refresh after a moment to see it appear.</p>

    <table v-if="images?.length" class="card">
      <thead>
        <tr>
          <th>Repo tags</th>
          <th>ID</th>
          <th>Size (MB)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="img in images" :key="img.id">
          <td>{{ (img.repo_tags || []).join(', ') || '<none>' }}</td>
          <td class="mono">{{ img.id?.slice(0, 19) }}</td>
          <td>{{ img.size_mb }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">No images cached on this node.</p>
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
.hint {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 16px;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.empty {
  color: var(--text-muted);
}
</style>
