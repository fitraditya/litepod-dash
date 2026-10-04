export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const name = getRouterParam(event, 'name')!
  const config = await getContainerConfig(nodeId, name)
  if (!config) throw createError({ statusCode: 404, statusMessage: 'container config not found' })
  return { name, config }
})
