export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const node = await getNode(nodeId)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  const { name } = await readBody<{ name: string }>(event)
  if (!name) throw createError({ statusCode: 400, statusMessage: 'name is required' })
  return litepod.createNetwork(node, name)
})
