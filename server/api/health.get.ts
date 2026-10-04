// Unauthenticated liveness/readiness probe: 200 when storage is reachable, 503 otherwise.
// Deliberately returns no details.
export default defineEventHandler(async (event) => {
  try {
    await listNodes()
    return { status: 'ok' }
  } catch {
    setResponseStatus(event, 503)
    return { status: 'unavailable' }
  }
})
