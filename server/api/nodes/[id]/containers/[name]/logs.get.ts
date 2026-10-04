export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const name = getRouterParam(event, 'name')!
  const node = await getNode(nodeId)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  const query = getQuery(event)
  const tail = query.tail ? Number(query.tail) : undefined
  const timestamps = query.timestamps === 'true'
  return litepod.logs(node, name, tail, timestamps)
})
