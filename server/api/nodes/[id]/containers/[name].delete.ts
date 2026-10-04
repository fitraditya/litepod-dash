export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const name = getRouterParam(event, 'name')!
  await deleteContainerConfig(nodeId, name)
  return { ok: true }
})
