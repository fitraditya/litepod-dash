export default defineEventHandler(async (event) => {
  const nodeId = getRouterParam(event, 'id')!
  const node = await getNode(nodeId)
  if (!node) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  const { image } = await readBody<{ image: string }>(event)
  if (!image) throw createError({ statusCode: 400, statusMessage: 'image is required' })
  return litepod.pullImage(node, image)
})
