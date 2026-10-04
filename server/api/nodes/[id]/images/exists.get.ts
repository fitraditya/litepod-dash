export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const node = await getNode(nodeId)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  const { name } = getQuery(event)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'name query param is required' })
  const exists = await litepod.imageExists(node, String(name))
  return { exists }
})
