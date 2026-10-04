export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const names = await listContainerConfigs(nodeId)
  return names
})
