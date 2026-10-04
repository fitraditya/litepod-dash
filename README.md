# dashpod

A minimal, database-free control-plane UI for [litepod](../litepod) agents — the per-node HTTP agent that manages Docker containers on a single host. dashpod is the dashboard that sits in front of one or many litepod nodes: it stores desired-state container configs as YAML and pushes them to each node's agent over HTTP. It never talks to Docker directly.

No database, no multi-user accounts — just a single login from `.env` and YAML files on local disk or S3.

## Features

- **Multi-node management** — register any number of litepod nodes (IP/port/API key), see live online/offline status.
- **Container lifecycle** — deploy, update (atomic stop-remove-start), start/stop/restart, pause/unpause, reset (wipe volume + restart), destroy; live state, stats (CPU/mem/net), IP, and log tail.
- **Full deploy surface** — the container config form mirrors litepod's entire `DeployPayload`: image, command/entrypoint, user, working dir, env, labels, memory/CPU limits, PIDs limit, shm size, ulimits, volumes (named or host bind mounts), tmpfs, read-only rootfs, networks, ports, DNS, extra hosts, stop signal/grace period, healthcheck, logging driver, dropped capabilities, security options, sysctls.
- **Simple by default, powerful when needed** — only the fields required to deploy (image, restart policy, memory/CPU limits, ports) are shown up front; everything else lives behind an "Advanced settings" panel, tabbed by category.
- **Images, networks, volumes** — list cached images, pull new ones in the background, check image existence; list/create/delete Docker networks and volumes per node.
- **No database** — node list and container configs are plain YAML files, on local disk or S3 (or any S3-compatible store — MinIO, R2, etc.).

## Requirements

- Node.js 18+ and [pnpm](https://pnpm.io)
- One or more running [litepod](../litepod) agents to manage

## Quickstart

```bash
cp .env.example .env   # set AUTH_USERNAME, AUTH_PASSWORD, SESSION_SECRET
pnpm install
pnpm dev
```

Open `http://localhost:3000`, sign in with the credentials from `.env`, and add your first node (its ID, IP/host, port, and the litepod `X-API-KEY`). Type the address as `https://host:port` (or tick TLS) for HTTPS agents.

## Configuration (`.env`)

| Variable | Description |
|---|---|
| `AUTH_USERNAME` / `AUTH_PASSWORD` | The single login for dashpod. No signup, no user table. |
| `SESSION_SECRET` | Random string (≥32 chars) used to HMAC-sign the session cookie. The server refuses to start if it's missing/short or `AUTH_PASSWORD` is empty. |
| `SESSION_MAX_AGE_HOURS` | Session lifetime (default `12`). "Sign out everywhere" invalidates all sessions at once. |
| `TRUSTED_PROXY_HOPS` | Number of reverse proxies in front of dashpod (default `0`). Needed so the login throttle/audit log see real client IPs; set `1` behind Vercel/nginx. |
| `AGENT_TLS_VERIFY` | `true` to require valid certificates on https agents. Default (empty) accepts self-signed certs, as produced by litepod's `generate-cert.sh` — traffic is encrypted but the agent's identity isn't verified. |
| `COOKIE_SECURE` | `true`/`false` to force the session cookie `Secure` flag; empty = auto (https or `X-Forwarded-Proto: https`). |
| `STORAGE_TYPE` | `local` (default) or `s3` — where node list + container configs live. |
| `STORAGE_LOCAL_PATH` | Root directory for local storage (default `./data`). |
| `S3_BUCKET`, `S3_REGION` | Required when `STORAGE_TYPE=s3`. |
| `S3_ENDPOINT` | Set for S3-compatible providers (MinIO, R2, etc.); leave empty for AWS. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | S3 credentials. |
| `S3_FORCE_PATH_STYLE` | `"true"` for providers that need path-style bucket addressing. |

## Storage layout

No database — node list and container configs are YAML files under one storage root:

```
<storage root>/
  nodes.yaml                 # [{ id, name, ip, port, api_key, tls }]
  <node_id>/
    <container_name>.yaml    # one docker-compose-flavored config per container
```

A container's YAML is the desired-state file, not a record of what's running — saving it does **not** deploy anything. Deploying/updating explicitly translates the YAML into a litepod `DeployPayload` and calls that node's agent (`X-API-KEY` from `nodes.yaml`).

## Project structure

```
app/
  pages/               file-based routes (login, node list, per-node containers/images/
                        networks/volumes, container create/edit)
  components/          AppShell (sidebar/topbar), ContainerConfigForm (basic + advanced tabs)
  composables/         useContainerForm — form state <-> ContainerConfig conversion
server/
  api/nodes/           node CRUD + per-node containers/images/networks/volumes endpoints
  utils/
    storage.ts          local-fs / S3 storage abstraction
    nodes.ts             node list CRUD (nodes.yaml)
    containers.ts        container config CRUD (<node_id>/<name>.yaml)
    litepod-client.ts    the only place that talks to litepod agents
    session.ts           signed-cookie auth
  middleware/auth.ts    blocks unauthenticated API access
```

## Build

```bash
pnpm build
node .output/server/index.mjs
```

`pnpm preview` previews a production build locally; `pnpm generate` is available but isn't the intended deploy path since dashpod needs its Nitro server API, not static output.

## Docker

```bash
docker build -t dashpod .
docker run -p 3000:3000 -v dashpod-data:/data \
  -e AUTH_PASSWORD=... -e SESSION_SECRET=$(openssl rand -hex 32) dashpod
```

Liveness probe: `GET /api/health` (unauthenticated, 200/503, no details). State-changing API calls are logged to stdout as JSON audit lines. Run it behind an HTTPS reverse proxy that sets `X-Forwarded-For`/`X-Forwarded-Proto`, and set `TRUSTED_PROXY_HOPS` accordingly. The login throttle is stored in the app storage (S3/local), so it holds across serverless instances (Vercel: set `STORAGE_TYPE=s3` and `TRUSTED_PROXY_HOPS=1`). Deferred hardening work is tracked in [TODO.md](TODO.md).
