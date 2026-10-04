// Accept an agent address typed as "https://host:8443" (or http://) in the IP/host field and
// split it into the stored ip / port / tls fields. A plain host is left untouched.
export interface AddressInput {
  ip?: unknown
  port?: unknown
  tls?: unknown
}

const SCHEME_RE = /^(https?):\/\/([^/\s:@?#]+)(?::(\d{1,5}))?\/?$/i

export function parseNodeAddress<T extends AddressInput>(input: T): T {
  if (typeof input?.ip !== 'string') return input
  const m = SCHEME_RE.exec(input.ip.trim())
  if (!m) return input
  const out: AddressInput = { ...input, ip: m[2], tls: m[1]!.toLowerCase() === 'https' }
  if (m[3]) out.port = Number(m[3])
  return out as T
}
