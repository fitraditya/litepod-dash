export default defineEventHandler(async (event) => {
  const session = await getAppSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'unauthenticated' })
  return { user: session.user }
})
