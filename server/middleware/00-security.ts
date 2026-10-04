// Runs before auth: security headers on every response + CSRF guard on state-changing /api calls.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    // Nuxt SSR emits inline bootstrap scripts/styles, hence 'unsafe-inline'.
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  }
  if (getRequestProtocol(event, { xForwardedProto: true }) === 'https') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }
  setResponseHeaders(event, headers)

  const path = (event.path || '').split('?')[0]
  if (!path.startsWith('/api/') || SAFE_METHODS.has(event.method)) return

  // Browsers always send Origin on cross-origin POST/PUT/DELETE; reject if it isn't us.
  const origin = getRequestHeader(event, 'origin')
  if (origin) {
    let originHost = ''
    try {
      originHost = new URL(origin).host
    } catch {}
    const host = getRequestHost(event, { xForwardedHost: true })
    if (originHost !== host) {
      throw createError({ statusCode: 403, statusMessage: 'cross-origin request blocked' })
    }
  } else if (getRequestHeader(event, 'sec-fetch-site') === 'cross-site') {
    throw createError({ statusCode: 403, statusMessage: 'cross-origin request blocked' })
  }
})
