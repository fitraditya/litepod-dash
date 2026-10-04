export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const name = getRouterParam(event, 'name')!
  const node = await getNode(nodeId)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  const config = await getContainerConfig(nodeId, name)
  if (!config) throw createError({ statusCode: 404, statusMessage: 'container config not found' })
  return litepod.deploy(node, name, config)
})
