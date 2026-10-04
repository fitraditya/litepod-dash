<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<style>
:root {
  --bg: #f4f5f7;
  --sidebar-bg: #181b24;
  --sidebar-text: #b8bcc8;
  --sidebar-text-active: #ffffff;
  --sidebar-hover: #262b38;
  --accent: #5b5fc7;
  --accent-hover: #4a4eb0;
  --card-bg: #ffffff;
  --border: #e3e5ea;
  --text: #1f2430;
  --text-muted: #6b7280;
  --success: #16a34a;
  --success-bg: #e8f7ee;
  --danger: #dc2626;
  --danger-bg: #fdecec;
  --warning: #d97706;
  --warning-bg: #fef3e2;
  --neutral-bg: #eef0f3;
}

* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
}
a {
  color: var(--accent);
  text-decoration: none;
}
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}
label.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-weight: 400;
}
a:hover {
  text-decoration: underline;
}
.app-shell {
  min-height: 100vh;
}
input,
select,
textarea,
button {
  font-family: inherit;
  font-size: 14px;
}
input,
select,
textarea {
  background: #fff;
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 6px 10px;
}
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
}
button {
  cursor: pointer;
  border: 1px solid var(--border);
  background: #fff;
  color: var(--text);
  border-radius: 6px;
  padding: 6px 12px;
  font-weight: 500;
}
button:hover {
  border-color: var(--accent);
  color: var(--accent);
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}
button.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: white;
}
button.danger {
  background: #fff;
  border-color: var(--danger);
  color: var(--danger);
}
button.danger:hover {
  background: var(--danger);
  color: white;
}
table {
  border-collapse: collapse;
  width: 100%;
}
th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}
tbody tr:last-child td {
  border-bottom: none;
}
tbody tr:hover {
  background: var(--neutral-bg);
}
.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: var(--neutral-bg);
  color: var(--text-muted);
}
.badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.badge.running {
  color: var(--success);
  background: var(--success-bg);
}
.badge.exited,
.badge.dead {
  color: var(--danger);
  background: var(--danger-bg);
}
.badge.paused,
.badge.restarting,
.badge.removing {
  color: var(--warning);
  background: var(--warning-bg);
}
.badge.created {
  color: var(--accent);
  background: #eeeefa;
}
</style>
