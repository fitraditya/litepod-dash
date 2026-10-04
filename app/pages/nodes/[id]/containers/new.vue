<script setup lang="ts">
const route = useRoute()
const nodeId = route.params.id as string
const { data: node } = await useFetch(`/api/nodes/${nodeId}`)

useHead({ title: computed(() => `Nodes / ${node.value?.name || nodeId} / Containers / New`) })

const name = ref('')
const form = emptyForm()
const error = ref('')
const saving = ref(false)

async function save() {
  error.value = ''
  if (!name.value || !form.image) {
    error.value = 'name and image are required'
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/nodes/${nodeId}/containers`, {
      method: 'POST',
      body: { name: name.value, config: formToConfig(form) },
    })
    await navigateTo(`/nodes/${nodeId}/containers/${name.value}`)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'failed to save'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppShell :node-id="nodeId" :node-name="node?.name">
    <template #breadcrumb>
      <NuxtLink to="/">Nodes</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}`">{{ node?.name || nodeId }}</NuxtLink> / <NuxtLink :to="`/nodes/${nodeId}/containers`">Containers</NuxtLink> / new
    </template>

    <h2>New container</h2>
    <form class="card" @submit.prevent="save">
      <label class="name-field">
        Container name (used as filename + Docker name)
        <input v-model="name" placeholder="my-app" required />
      </label>
      <ContainerConfigForm v-model="form" />
      <p v-if="error" class="error">{{ error }}</p>
      <div class="save-row">
        <button class="primary" type="submit" :disabled="saving">Save config</button>
      </div>
    </form>
  </AppShell>
</template>

<style scoped>
h2 {
  margin: 0 0 16px;
}
.name-field {
  margin-bottom: 20px;
  max-width: 360px;
}
.error {
  color: var(--danger);
}
.save-row {
  margin-top: 20px;
}
</style>
