export default defineEventHandler(async (event) => {
  const body = assertNodeInput(parseNodeAddress((await readBody(event)) ?? {}), false) as any
  const node = await createNode({
    id: body.id,
    name: body.name || body.id,
    ip: body.ip,
    port: body.port || 8080,
    api_key: body.api_key,
    tls: !!body.tls,
  })
  return publicNode(node)
})
