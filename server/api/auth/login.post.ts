import { createHash, timingSafeEqual } from 'node:crypto'

// Hash first so both buffers are equal length and comparison is constant-time.
function safeEqual(a: unknown, b: string) {
  const ha = createHash('sha256').update(String(a ?? '')).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export default defineEventHandler(async (event) => {
  const ip = clientIp(event)
  await assertLoginAllowed(ip)

  const { username, password } = (await readBody(event)) ?? {}
  const config = appConfig()

  const userOk = safeEqual(username, config.authUsername)
  const passOk = safeEqual(password, config.authPassword)
  if (!userOk || !passOk) {
    await recordLoginFailure(useAppStorage(), ip)
    throw createError({ statusCode: 401, statusMessage: 'invalid credentials' })
  }

  await clearLoginFailures(useAppStorage(), ip)
  setSessionCookie(event, config.authUsername)
  return { ok: true, user: config.authUsername }
})
