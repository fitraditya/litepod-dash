<script setup lang="ts">
const form = defineModel<ReturnType<typeof emptyForm>>({ required: true })
defineProps<{ lockImage?: boolean }>()

function addRow(list: any[], row: any) {
  list.push(row)
}

const showAdvanced = ref(false)

const tabs = [
  { id: 'command', label: 'Command & logging' },
  { id: 'volumes', label: 'Volumes' },
  { id: 'network', label: 'Network' },
  { id: 'env', label: 'Env' },
  { id: 'labels', label: 'Labels' },
  { id: 'resources', label: 'Resources' },
  { id: 'hardening', label: 'Capabilities' },
  { id: 'healthcheck', label: 'Healthcheck' },
] as const
const activeTab = ref<(typeof tabs)[number]['id']>('command')
</script>

<template>
  <div class="fields">
    <label>
      Image
      <input v-model="form.image" placeholder="nginx:latest" required :disabled="lockImage" />
      <span v-if="lockImage" class="field-note">Image is fixed after creation — destroy and recreate to change it.</span>
    </label>
    <label>
      Restart policy
      <select v-model="form.restart">
        <option value="no">no</option>
        <option value="always">always</option>
        <option value="unless-stopped">unless-stopped</option>
        <option value="on-failure">on-failure</option>
      </select>
    </label>
    <label>Memory limit (MB)<input v-model.number="form.memory_limit_mb" type="number" required /></label>
    <label>CPU limit (cores)<input v-model.number="form.cpu_limit" type="number" step="0.1" required /></label>
  </div>

  <section class="subsection">
    <div class="subheader">
      <h4>Ports</h4>
      <button type="button" @click="addRow(form.ports, { host: null, container: null, protocol: 'tcp' })">+ Add</button>
    </div>
    <div v-for="(row, i) in form.ports" :key="i" class="repeat-row ports">
      <input v-model.number="row.host" type="number" placeholder="host port" />
      <input v-model.number="row.container" type="number" placeholder="container port" />
      <select v-model="row.protocol">
        <option value="tcp">tcp</option>
        <option value="udp">udp</option>
      </select>
      <button type="button" class="danger" @click="form.ports.splice(i, 1)">✕</button>
    </div>
    <p v-if="!form.ports.length" class="empty-hint">No ports published.</p>
  </section>

  <button type="button" class="advanced-toggle" @click="showAdvanced = !showAdvanced">
    <span class="chevron" :class="{ open: showAdvanced }">▸</span> Advanced settings
  </button>

  <div v-if="showAdvanced" class="advanced">
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'command'" class="tab-panel">
      <div class="fields">
        <label>Command<input v-model="form.command" placeholder="space separated, e.g. nginx -g 'daemon off;'" /></label>
        <label>Entrypoint<input v-model="form.entrypoint" placeholder="space separated" /></label>
        <label>Run as user<input v-model="form.user" placeholder="uid, name, or user:group" /></label>
        <label>Working dir<input v-model="form.working_dir" placeholder="/app" /></label>
        <label>Stop signal<input v-model="form.stop_signal" placeholder="SIGTERM" /></label>
        <label>Stop grace period (s)<input v-model.number="form.stop_grace_period" type="number" /></label>
        <label>Log driver<input v-model="form.logging_driver" placeholder="json-file" /></label>
      </div>
      <template v-if="form.logging_driver">
        <div class="subheader spaced">
          <span class="hint">Log driver options</span>
          <button type="button" @click="addRow(form.logging_options, { key: '', value: '' })">+ Add</button>
        </div>
        <div v-for="(row, i) in form.logging_options" :key="i" class="repeat-row">
          <input v-model="row.key" placeholder="max-size" />
          <input v-model="row.value" placeholder="10m" />
          <button type="button" class="danger" @click="form.logging_options.splice(i, 1)">✕</button>
        </div>
      </template>
    </div>

    <div v-if="activeTab === 'volumes'" class="tab-panel">
      <div class="subheader">
        <span class="hint">Volumes</span>
        <button type="button" @click="addRow(form.volumes, { type: 'docker', name: '', host_path: '', path: '', read_only: false })">+ Add</button>
      </div>
      <div v-for="(row, i) in form.volumes" :key="i" class="repeat-row volumes">
        <select v-model="row.type">
          <option value="docker">docker</option>
          <option value="host">host</option>
        </select>
        <input v-if="row.type === 'docker'" v-model="row.name" placeholder="volume name" />
        <input v-else v-model="row.host_path" placeholder="host path (relative to volume base)" />
        <input v-model="row.path" placeholder="container path" />
        <label class="checkbox"><input v-model="row.read_only" type="checkbox" /> read-only</label>
        <button type="button" class="danger" @click="form.volumes.splice(i, 1)">✕</button>
      </div>
      <p v-if="!form.volumes.length" class="empty-hint">No volumes mounted.</p>

      <div class="subheader spaced">
        <span class="hint">tmpfs mounts</span>
        <button type="button" @click="addRow(form.tmpfs, { path: '', options: '' })">+ Add</button>
      </div>
      <div v-for="(row, i) in form.tmpfs" :key="i" class="repeat-row">
        <input v-model="row.path" placeholder="/tmp/cache" />
        <input v-model="row.options" placeholder="size=64m" />
        <button type="button" class="danger" @click="form.tmpfs.splice(i, 1)">✕</button>
      </div>
      <label class="checkbox spaced"><input v-model="form.read_only" type="checkbox" /> Read-only root filesystem</label>
    </div>

    <div v-if="activeTab === 'network'" class="tab-panel">
      <div class="fields">
        <label>Networks<input v-model="form.networks" placeholder="comma separated network names" /></label>
        <label>DNS servers<input v-model="form.dns" placeholder="comma separated, e.g. 1.1.1.1, 8.8.8.8" /></label>
        <label>DNS search domains<input v-model="form.dns_search" placeholder="comma separated" /></label>
        <label>Extra hosts<input v-model="form.extra_hosts" placeholder="comma separated host:ip entries" /></label>
      </div>
    </div>

    <div v-if="activeTab === 'env'" class="tab-panel">
      <div class="subheader">
        <span class="hint">Environment variables</span>
        <button type="button" @click="addRow(form.env, { key: '', value: '' })">+ Add</button>
      </div>
      <div v-for="(row, i) in form.env" :key="i" class="repeat-row">
        <input v-model="row.key" placeholder="KEY" />
        <input v-model="row.value" placeholder="value" />
        <button type="button" class="danger" @click="form.env.splice(i, 1)">✕</button>
      </div>
      <p v-if="!form.env.length" class="empty-hint">No environment variables.</p>
    </div>

    <div v-if="activeTab === 'labels'" class="tab-panel">
      <div class="subheader">
        <span class="hint">Labels</span>
        <button type="button" @click="addRow(form.labels, { key: '', value: '' })">+ Add</button>
      </div>
      <div v-for="(row, i) in form.labels" :key="i" class="repeat-row">
        <input v-model="row.key" placeholder="key" />
        <input v-model="row.value" placeholder="value" />
        <button type="button" class="danger" @click="form.labels.splice(i, 1)">✕</button>
      </div>
      <p v-if="!form.labels.length" class="empty-hint">No labels.</p>
    </div>

    <div v-if="activeTab === 'resources'" class="tab-panel">
      <div class="fields">
        <label>Memory reservation (MB)<input v-model.number="form.memory_reservation_mb" type="number" /></label>
        <label>PIDs limit<input v-model.number="form.pids_limit" type="number" /></label>
        <label>/dev/shm size (MB)<input v-model.number="form.shm_size_mb" type="number" /></label>
      </div>
      <div class="subheader spaced">
        <span class="hint">Ulimits</span>
        <button type="button" @click="addRow(form.ulimits, { name: '', soft: null, hard: null })">+ Add</button>
      </div>
      <div v-for="(row, i) in form.ulimits" :key="i" class="repeat-row ulimits">
        <input v-model="row.name" placeholder="nofile" />
        <input v-model.number="row.soft" type="number" placeholder="soft" />
        <input v-model.number="row.hard" type="number" placeholder="hard" />
        <button type="button" class="danger" @click="form.ulimits.splice(i, 1)">✕</button>
      </div>
      <p v-if="!form.ulimits.length" class="empty-hint">No ulimits set.</p>
    </div>

    <div v-if="activeTab === 'hardening'" class="tab-panel">
      <div class="fields">
        <label>Drop capabilities<input v-model="form.cap_drop" placeholder="comma separated, e.g. NET_RAW" /></label>
        <label>Security opt<input v-model="form.security_opt" placeholder="comma separated, e.g. no-new-privileges" /></label>
      </div>
      <div class="subheader spaced">
        <span class="hint">Sysctls</span>
        <button type="button" @click="addRow(form.sysctls, { key: '', value: '' })">+ Add</button>
      </div>
      <div v-for="(row, i) in form.sysctls" :key="i" class="repeat-row">
        <input v-model="row.key" placeholder="net.core.somaxconn" />
        <input v-model="row.value" placeholder="1024" />
        <button type="button" class="danger" @click="form.sysctls.splice(i, 1)">✕</button>
      </div>
      <p v-if="!form.sysctls.length" class="empty-hint">No sysctls set.</p>
    </div>

    <div v-if="activeTab === 'healthcheck'" class="tab-panel">
      <div class="fields">
        <label class="span-2">Healthcheck command<input v-model="form.healthcheck_test" placeholder="CMD-SHELL curl -f http://localhost/ || exit 1" /></label>
        <label>Interval (s)<input v-model.number="form.healthcheck_interval" type="number" /></label>
        <label>Timeout (s)<input v-model.number="form.healthcheck_timeout" type="number" /></label>
        <label>Retries<input v-model.number="form.healthcheck_retries" type="number" /></label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}
.span-2 {
  grid-column: span 2;
}
.subsection {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.subheader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.subheader.spaced {
  margin-top: 20px;
}
.subheader h4,
h4 {
  margin: 0;
  font-size: 14px;
}
.hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
}
.field-note {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}
.empty-hint {
  color: var(--text-muted);
  font-size: 13px;
  margin: 8px 0 0;
}
.repeat-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-top: 8px;
}
.repeat-row.ports {
  grid-template-columns: 1fr 1fr 100px auto;
}
.repeat-row.volumes {
  grid-template-columns: 110px 1fr 1fr 110px auto;
  align-items: center;
}
.repeat-row.ulimits {
  grid-template-columns: 1fr 1fr 1fr auto;
}
.checkbox.spaced {
  margin-top: 20px;
}

.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  background: none;
  border: none;
  color: var(--accent);
  padding: 4px 0;
  font-weight: 600;
}
.advanced-toggle:hover {
  border: none;
  color: var(--accent-hover);
}
.chevron {
  display: inline-block;
  transition: transform 0.15s;
  font-size: 11px;
}
.chevron.open {
  transform: rotate(90deg);
}

.advanced {
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 10px;
  background: var(--neutral-bg);
  border-bottom: 1px solid var(--border);
}
.tab {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
}
.tab:hover {
  color: var(--text);
  border: none;
}
.tab.active {
  background: var(--accent);
  color: white;
}
.tab-panel {
  padding: 20px;
}
</style>
