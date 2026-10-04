const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/health'])

export default defineEventHandler(async (event) => {
  const path = (event.path || event.node.req.url || '').split('?')[0]
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PATHS.has(path)) return

  const session = await getAppSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  }
})
