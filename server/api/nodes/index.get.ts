export default defineEventHandler(async () => {
  const nodes = await listNodes()
  return nodes.map(publicNode)
})
