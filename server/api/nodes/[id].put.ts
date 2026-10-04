export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const raw = parseNodeAddress((await readBody(event)) ?? {})
  const body = assertNodeInput(raw, true) as any
  // Only these fields are updatable; empty/missing api_key means "keep the existing key"
  // (the key is never sent to the browser).
  const patch: Record<string, unknown> = {}
  for (const k of ['name', 'ip', 'port', 'tls'] as const) if (body[k] !== undefined && body[k] !== '') patch[k] = body[k]
  if (body.api_key) patch.api_key = body.api_key
  return publicNode(await updateNode(id, patch))
})
