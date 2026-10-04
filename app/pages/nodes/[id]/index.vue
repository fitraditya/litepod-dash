<script setup lang="ts">
import IconBox from '~/components/IconBox.vue'
import IconImage from '~/components/IconImage.vue'
import IconNetwork from '~/components/IconNetwork.vue'
import IconVolume from '~/components/IconVolume.vue'

const route = useRoute()
const nodeId = route.params.id as string

const { data: node } = await useFetch(`/api/nodes/${nodeId}`)
const { data: configNames } = await useFetch<string[]>(`/api/nodes/${nodeId}/containers`)
const { data: liveList } = await useFetch<any[]>(`/api/nodes/${nodeId}/live`, { default: () => [] })
const { data: images } = await useFetch<any[]>(`/api/nodes/${nodeId}/images`, { default: () => [] })
const { data: networks } = await useFetch<{ resources: string[] }>(`/api/nodes/${nodeId}/networks`, {
  default: () => ({ resources: [] }),
})
const { data: volumes } = await useFetch<{ resources: string[] }>(`/api/nodes/${nodeId}/volumes`, {
  default: () => ({ resources: [] }),
})

useHead({ title: computed(() => `Nodes / ${node.value?.name || nodeId}`) })

const runningCount = computed(
  () => liveList.value?.filter((c) => c.State === 'running').length || 0,
)

const stats = computed(() => [
  {
    label: 'Containers',
    value: configNames.value?.length || 0,
    sub: `${runningCount.value} running`,
    icon: IconBox,
    tone: 'accent',
    to: `/nodes/${nodeId}/containers`,
  },
  {
    label: 'Images',
    value: images.value?.length || 0,
    icon: IconImage,
    tone: 'blue',
    to: `/nodes/${nodeId}/images`,
  },
  {
    label: 'Networks',
    value: networks.value?.resources?.length || 0,
    icon: IconNetwork,
    tone: 'green',
    to: `/nodes/${nodeId}/networks`,
  },
  {
    label: 'Volumes',
    value: volumes.value?.resources?.length || 0,
    icon: IconVolume,
    tone: 'amber',
    to: `/nodes/${nodeId}/volumes`,
  },
])
</script>

<template>
  <AppShell :node-id="nodeId" :node-name="node?.name">
    <template #breadcrumb>
      <NuxtLink to="/">Nodes</NuxtLink> / {{ node?.name || nodeId }}
    </template>

    <div class="row">
      <h2>{{ node?.name || nodeId }} <span class="muted">{{ node?.ip }}:{{ node?.port }}</span></h2>
    </div>

    <div class="stat-grid">
      <NuxtLink v-for="s in stats" :key="s.label" :to="s.to" class="card stat-card">
        <div class="stat-icon" :class="s.tone">
          <component :is="s.icon" />
        </div>
        <div>
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
          <div v-if="s.sub" class="stat-sub">{{ s.sub }}</div>
        </div>
      </NuxtLink>
    </div>
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
.muted {
  color: var(--text-muted);
  font-weight: 400;
  font-size: 14px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  color: var(--text);
}
.stat-card:hover {
  border-color: var(--accent);
  text-decoration: none;
}
.stat-icon {
  flex: none;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}
.stat-icon.accent {
  background: #eeeefa;
  color: var(--accent);
}
.stat-icon.blue {
  background: #e6f0fe;
  color: #2563eb;
}
.stat-icon.green {
  background: var(--success-bg);
  color: var(--success);
}
.stat-icon.amber {
  background: var(--warning-bg);
  color: var(--warning);
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}
.stat-sub {
  font-size: 12px;
  color: var(--text-muted);
}
</style>
