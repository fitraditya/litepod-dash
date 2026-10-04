// Audit log: one JSON line on stdout per state-changing /api call (who, what, result).
// Request bodies are never logged (they contain agent API keys / env secrets).
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', async (event) => {
    const path = (event.path || '').split('?')[0]
    if (!path.startsWith('/api/') || ['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return
    let user: string | null = null
    try {
      user = (await getAppSession(event))?.user ?? null
    } catch {}
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        audit: true,
        user,
        ip: clientIp(event),
        method: event.method,
        path,
        status: event.node.res.statusCode,
      }),
    )
  })
})
