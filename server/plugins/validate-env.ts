// Fail fast on startup instead of running with forgeable sessions / an empty password.
export default defineNitroPlugin(() => {
  const config = appConfig()
  const problems: string[] = []
  if (!config.authPassword) problems.push('AUTH_PASSWORD must be set')
  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    problems.push('SESSION_SECRET must be set and at least 32 characters')
  }
  if (problems.length) {
    throw new Error(`dashpod misconfigured: ${problems.join('; ')}`)
  }
})
