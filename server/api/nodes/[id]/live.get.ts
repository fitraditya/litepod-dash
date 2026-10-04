export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const node = await getNode(id)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  return litepod.list(node)
})
