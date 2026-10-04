// Client IP for throttling/audit. X-Forwarded-For is client-controlled unless a trusted proxy
// writes it, so only trust it for the number of proxy hops you actually run
// (TRUSTED_PROXY_HOPS, default 0 = ignore the header and use the socket address).
// With N hops the real client is the Nth entry from the *right* (each proxy appends the peer
// it saw), which an attacker can't forge by sending their own header.
export function pickClientIp(xff: string | undefined, socketIp: string | undefined, hops: number): string {
  if (hops > 0 && xff) {
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
    const ip = parts[parts.length - hops]
    if (ip) return ip
  }
  return socketIp || 'unknown'
}

export function clientIp(event: any): string {
  const hops = Number(appConfig().trustedProxyHops) || 0
  return pickClientIp(getRequestHeader(event, 'x-forwarded-for'), event.node?.req?.socket?.remoteAddress, hops)
}
