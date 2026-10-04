// Invalidate every session issued so far (all browsers/devices), including this one.
export default defineEventHandler(async (event) => {
  await revokeAllSessions()
  clearSessionCookie(event)
  return { ok: true }
})
