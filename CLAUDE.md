# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

dashpod: a database-free control-plane UI for [litepod](../litepod) agents. Litepod is a per-node HTTP agent that manages Docker containers on a single host (`X-API-KEY` auth, no UI of its own). dashpod is the multi-node dashboard that sits in front of it — it stores node list + container configs as YAML files (local disk or S3) and calls each node's litepod agent directly over HTTP. dashpod never talks to Docker itself.

## Commands

```bash
pnpm install
cp .env.example .env   # set AUTH_USERNAME, AUTH_PASSWORD, SESSION_SECRET before running
pnpm dev               # nuxt dev
pnpm build              # nuxt build -> .output/
pnpm test                # vitest (tests/*.test.ts: session, throttle, validation, healthcheck parsing)
pnpm preview             # preview a production build
pnpm generate             # static generation (not the primary deploy path; app is SSR w/ a server API)
node .output/server/index.mjs   # run a production build
```

No lint script configured. Run one test file: `pnpm vitest run tests/validate.test.ts`. Tests only cover pure modules (`session-core.ts`, `login-throttle.ts`, `validate.ts`, `useContainerForm.ts`) — keep Nitro-global-dependent code (`createError`, `useRuntimeConfig`) in thin wrappers so the logic stays testable. Deferred hardening items live in `TODO.md`.

## Configuration (.env)

- `AUTH_USERNAME` / `AUTH_PASSWORD` — single hardcoded user, no signup/DB.
- `SESSION_SECRET` — HMAC key for signing the session cookie (≥32 chars; `server/plugins/validate-env.ts` aborts startup if it or `AUTH_PASSWORD` is bad).
- `COOKIE_SECURE` — `true`/`false`/empty(auto) for the session cookie `Secure` flag.
- `STORAGE_TYPE` — `local` (default) or `s3`; selects the storage backend at `server/utils/storage.ts`.
- `STORAGE_LOCAL_PATH` — root dir for local storage (default `./data`).
- `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` — only used when `STORAGE_TYPE=s3` (endpoint/force-path-style needed for MinIO/R2-style providers).

Env vars are read at runtime through `appConfig()` (which also loads `./.env` or `$ENV_FILE` once via `process.loadEnvFile`; real env vars take precedence) in `server/utils/app-config.ts` — add new ones there. Don't put `process.env.X` into `runtimeConfig` in `nuxt.config.ts`: it's baked in at build time, so a production build would ignore the real environment.

## Storage layout

Everything lives under one storage root (local dir or S3 bucket), no database:

```
<storage root>/
  nodes.yaml                 # list of nodes: {id, name, ip, port, api_key, tls}
  <node_id>/
    <container_name>.yaml    # one docker-compose-flavored config per container
```

- `server/utils/nodes.ts` — CRUD over `nodes.yaml` (writes serialized by an in-process lock; `publicNode()` strips `api_key` for anything sent to the browser). Node `id` is also the directory name for that node's container configs, so it's validated against `[a-zA-Z0-9][a-zA-Z0-9_.-]*` (see `assertValidNodeId` in `server/utils/containers.ts`) to prevent path traversal. Container names go through the same regex (`assertValidName`) since they become file names.
- `server/utils/containers.ts` — CRUD over `<node_id>/<name>.yaml`. `ContainerConfig` is the YAML schema, deliberately docker-compose-shaped rather than litepod-shaped, but its field set is a 1:1 mirror of litepod's `DeployPayload` (identity/image, resources, storage, networking, lifecycle, hardening — see `../litepod/CLAUDE.md` "Deploy payload fields" for the authoritative list) so every agent capability is reachable from YAML. Litepod has no per-user concept — no `user_id` anywhere (deploy, volumes, networks); resources are node-global, not namespaced.
- Saving a container config here does **not** deploy it — it's just the desired-state file. Deploying is a separate explicit action that pushes the config to the agent.

## litepod integration

`server/utils/litepod-client.ts` is the only place that talks to litepod agents; every function sends `X-API-KEY: <node.api_key>` from `nodes.yaml` against a base URL built by `nodeBaseUrl()` (node's `ip`/`port`/`tls`). It covers the full agent surface:

- Container lifecycle: `deploy`/`update`/`destroy`, `action()` (start/stop/restart/reset/pause/unpause/kill/suspend/unsuspend, whitelisted in `[action].post.ts`), `list`, `state`, `stats`, `ip`, `logs`.
- Images: `listImages`, `imageExists` (turns the agent's `HEAD /images` 404-or-200 into a boolean), `pullImage` (agent runs the pull in the background; the UI's Images page polls `imageExists`/list after triggering a pull rather than waiting synchronously).
- Networks/volumes: `list*`/`create*`/`delete*`, unscoped — node-global resources, no `user_id`.

Agent address: node `ip` may be typed as `https://host:port` — `server/utils/node-address.ts` splits it into ip/port/tls on save. https agents go through `httpsFetcher()` (`server/utils/agent-tls.ts`), which accepts self-signed certs unless `AGENT_TLS_VERIFY=true`; it must use undici's own `fetch` (Node's built-in one rejects the foreign dispatcher). `agentFetch` also applies timeouts, retries 429s (agent rate limit is per client IP), and maps agent 401/403 to 502 so the browser doesn't read it as a dashpod session expiry.

`toDeployRequest()` translates a `ContainerConfig` YAML into litepod's `DeployPayload` JSON shape, omitting any key the user left empty (the agent's `DisallowUnknownFields` decoding is fine with missing optional keys but some numeric fields are validated only when present, e.g. `memory_reservation` must not exceed `memory_limit` if set at all). If litepod's payload shape changes, update `toDeployRequest()` — this is the single translation boundary between dashpod's compose-style config and litepod's wire format.

## Auth

No user table — one set of credentials from `.env`, checked in `server/api/auth/login.post.ts` (constant-time compare, per-IP failed-attempt throttle in `server/utils/login-throttle.ts`, persisted in app storage under `.throttle/` so it works across serverless instances). Session is a signed cookie (`server/utils/session-core.ts` signs/verifies HMAC-SHA256 over `{user, iat, exp}`; `session.ts` wraps it; `SESSION_MAX_AGE_HOURS`, default 12; name `dashpod_session`), not a JWT/DB-backed session. "Sign out everywhere" (`/api/auth/logout-all`) writes `revoked_before` to `session-state.yaml` in storage; sessions with an older `iat` are rejected (cached 10s).

- `server/middleware/00-security.ts` — security headers (CSP, HSTS on https, etc.) on every response, plus Origin-based CSRF rejection for non-GET `/api/*`.
- `server/middleware/auth.ts` — global Nitro middleware, blocks all `/api/*` except `/api/auth/login` and `/api/health` when there's no valid session cookie.
- `server/plugins/audit.ts` — JSON audit line on stdout for every non-GET `/api/*` response (never logs bodies). `server/utils/validate.ts` validates node and container-config request bodies (unknown container-config keys are rejected — add new `ContainerConfig` fields to `CONFIG_KEYS` there too).
- `app/middleware/auth.global.ts` — global Vue Router middleware, redirects to `/login` when `/api/auth/me` fails. Uses `useRequestFetch()` on the server so the session cookie is forwarded during SSR (plain `$fetch` would not carry it).

Note: `getAppSession`/`setSessionCookie`/`clearSessionCookie` (in `server/utils/session.ts`) are intentionally *not* named `getSession` — h3 exports its own `getSession` global and Nitro auto-import would silently shadow one or the other.

## Routing conventions

Nitro file-based routes under `server/api/`, mirroring the storage layout:

```
server/api/nodes/index.get.ts              GET  /api/nodes            (list, api_key stripped)
server/api/nodes/index.post.ts             POST /api/nodes            (create)
server/api/nodes/[id].{get,put,delete}.ts  ...  /api/nodes/:id
server/api/nodes/[id]/health.get.ts        GET  /api/nodes/:id/health  (proxies agent /health)
server/api/nodes/[id]/live.get.ts          GET  /api/nodes/:id/live    (proxies agent /containers list)
server/api/nodes/[id]/containers/...       config CRUD (YAML, no agent call)
server/api/nodes/[id]/containers/[name]/deploy.post.ts    calls litepod Run
server/api/nodes/[id]/containers/[name]/update.post.ts    calls litepod atomic update
server/api/nodes/[id]/containers/[name]/destroy.post.ts   calls litepod destroy
server/api/nodes/[id]/containers/[name]/{state,stats,logs,ip}.get.ts  live inspection, proxied
server/api/nodes/[id]/containers/[name]/[action].post.ts  start/stop/restart/reset/pause/unpause/kill/suspend/unsuspend
server/api/nodes/[id]/images/index.get.ts                 GET  /api/nodes/:id/images         (list)
server/api/nodes/[id]/images/exists.get.ts                GET  /api/nodes/:id/images/exists   (?name=, wraps agent HEAD)
server/api/nodes/[id]/images/pull.post.ts                 POST /api/nodes/:id/images/pull      (background pull)
server/api/nodes/[id]/networks/index.{get,post}.ts        GET/POST /api/nodes/:id/networks     (list / {name})
server/api/nodes/[id]/networks/[name].delete.ts           DELETE  /api/nodes/:id/networks/:name
server/api/nodes/[id]/volumes/...                         same shape as networks
```

Static routes (`deploy.post.ts`, `update.post.ts`, `destroy.post.ts`, etc.) take precedence over the catch-all `[action].post.ts` — that's what lets a small whitelist (`ALLOWED` set in `[action].post.ts`) handle the rest of the lifecycle actions without one file each. `kill` additionally forwards an optional `?signal=` query param.

Frontend pages under `app/pages/` mirror the same node/container nesting (`nodes/[id]/index.vue`, `nodes/[id]/containers/index.vue` (merges stored config names with the agent's live list, bulk actions), `nodes/[id]/containers/new.vue`, `nodes/[id]/containers/[name].vue`, plus `nodes/[id]/{images,networks,volumes}/index.vue`). Shared container-config editing state lives in `app/composables/useContainerForm.ts` (`emptyForm`/`formToConfig`/`configToForm`) and is consumed by `app/components/ContainerConfigForm.vue`, used from both the "new" and "edit" pages. `ContainerConfigForm.vue` shows only the fields litepod needs to deploy (image, restart policy, memory/cpu limits, ports) by default; everything else (command, volumes, networking, env, labels, resources, hardening, healthcheck) lives behind an "Advanced settings" toggle, tabbed by category.

Icons are hand-written SVG components (`app/components/Icon*.vue`), no icon library; no CSS framework either.
