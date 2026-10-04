import { Agent, fetch as undiciFetch } from 'undici'

// litepod agents commonly serve self-signed certificates (scripts/generate-cert.sh), so https
// agents are accepted without chain verification by default. Set AGENT_TLS_VERIFY=true to
// require a valid certificate (e.g. when agents sit behind a real CA-signed proxy).
//
// The relaxed Agent must be paired with undici's own `fetch`: Node's built-in fetch bundles a
// different undici and rejects foreign dispatchers (UND_ERR_INVALID_ARG).
let relaxed: typeof $fetch | null = null

/** The fetcher to use for an https agent: self-signed-tolerant unless AGENT_TLS_VERIFY=true. */
export function httpsFetcher(): typeof $fetch {
  if (appConfig().agentTlsVerify === 'true') return $fetch
  return (relaxed ??= $fetch.create(
    { dispatcher: new Agent({ connect: { rejectUnauthorized: false } }) } as any,
    { fetch: undiciFetch as any } as any,
  ))
}
