export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const name = getRouterParam(event, 'name')!
  const config = assertContainerConfig(await readBody(event))
  await saveContainerConfig(nodeId, name, config)
  return { ok: true }
})
