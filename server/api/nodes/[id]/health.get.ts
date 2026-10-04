export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const node = await getNode(id)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  try {
    return await litepod.health(node)
  } catch {
    return { status: 'unreachable' }
  }
})
