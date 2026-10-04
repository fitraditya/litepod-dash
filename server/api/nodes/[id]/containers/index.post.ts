export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const body = await readBody<{ name: string; config: unknown }>(event)
  if (!body?.name) {
    throw createError({ statusCode: 400, statusMessage: 'name and config.image are required' })
  }
  const config = assertContainerConfig(body.config)
  const existing = await getContainerConfig(nodeId, body.name)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: `container "${body.name}" already exists` })
  }
  await saveContainerConfig(nodeId, body.name, config)
  return { ok: true, name: body.name }
})
