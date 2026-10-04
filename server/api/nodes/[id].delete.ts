export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await deleteNode(id)
  // Remove the node's stored container configs too, so re-adding the same id doesn't resurrect them.
  for (const name of await listContainerConfigs(id)) await deleteContainerConfig(id, name)
  return { ok: true }
})
