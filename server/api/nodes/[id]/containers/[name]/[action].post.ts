const ALLOWED = new Set([
  'start',
  'stop',
  'restart',
  'reset',
  'pause',
  'unpause',
  'kill',
  'suspend',
  'unsuspend',
])

export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const name = getRouterParam(event, 'name')!
  const action = getRouterParam(event, 'action')!
  if (!ALLOWED.has(action)) {
    throw createError({ statusCode: 400, statusMessage: `unknown action "${action}"` })
  }
  const node = await getNode(nodeId)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })

  const query = getQuery(event)
  const extra = action === 'kill' && query.signal ? { signal: String(query.signal) } : undefined
  return litepod.action(node, name, action as any, extra)
})
