<script setup lang="ts">
const props = defineProps<{
  nodeId?: string
  nodeName?: string
}>()

const route = useRoute()

const nodeNavItems = computed(() => {
  if (!props.nodeId) return []
  const base = `/nodes/${props.nodeId}`
  return [
    { label: 'Dashboard', to: base, icon: '◫', exact: true },
    { label: 'Containers', to: `${base}/containers`, icon: '▣' },
    { label: 'Images', to: `${base}/images`, icon: '⬢' },
    { label: 'Networks', to: `${base}/networks`, icon: '⇄' },
    { label: 'Volumes', to: `${base}/volumes`, icon: '⛁' },
  ]
})

function isActive(to: string, exact?: boolean) {
  return route.path === to || (!exact && route.path.startsWith(`${to}/`))
}

async function logout(everywhere = false) {
  await $fetch(everywhere ? '/api/auth/logout-all' : '/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <NuxtLink to="/" class="brand">
        <span class="brand-mark"><IconRocket /></span>
        <span class="brand-name">Litepod</span>
      </NuxtLink>

      <nav class="nav">
        <NuxtLink to="/" class="nav-item" :class="{ active: route.path === '/' }">
          <span class="nav-icon">⌂</span> Nodes
        </NuxtLink>

        <template v-if="nodeId">
          <div class="nav-section">{{ nodeName || nodeId }}</div>
          <NuxtLink
            v-for="item in nodeNavItems"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{ active: isActive(item.to, item.exact) }"
          >
            <span class="nav-icon">{{ item.icon }}</span> {{ item.label }}
          </NuxtLink>
        </template>
      </nav>

      <button class="signout" @click="logout(false)">Sign out</button>
      <button class="signout" title="Invalidate all sessions on every device" @click="logout(true)">
        Sign out everywhere
      </button>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="breadcrumb"><slot name="breadcrumb" /></div>
      </header>
      <main class="content"><slot /></main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 20px;
  text-decoration: none;
}
.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}
.brand-name {
  color: white;
  font-weight: 700;
  font-size: 16px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}
.nav-section {
  color: #6c7280;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  padding: 16px 12px 6px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 7px;
  color: var(--sidebar-text);
  font-size: 14px;
  font-weight: 500;
}
.nav-item:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text-active);
  text-decoration: none;
}
.nav-item.active {
  background: var(--accent);
  color: white;
}
.nav-icon {
  width: 16px;
  text-align: center;
  opacity: 0.85;
}
.signout {
  background: transparent;
  border: 1px solid #333949;
  color: var(--sidebar-text);
  margin-top: 12px;
}
.signout:hover {
  border-color: var(--accent);
  color: white;
}
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: 52px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  background: var(--card-bg);
  display: flex;
  align-items: center;
  padding: 0 24px;
}
.breadcrumb {
  color: var(--text-muted);
  font-size: 13px;
}
.breadcrumb :deep(a) {
  color: var(--text-muted);
}
.content {
  flex: 1;
  padding: 24px;
  width: 100%;
}
</style>
