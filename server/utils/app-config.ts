// Read plain env vars (AUTH_PASSWORD, S3_BUCKET, ...) at *runtime*. Values put into
// runtimeConfig via `process.env` in nuxt.config.ts are baked into the bundle at build time,
// so a production build would ignore the real environment. NUXT_* overrides still work.
export function appConfig() {
  const rc = useRuntimeConfig()
  const e = process.env
  return {
    authUsername: e.AUTH_USERNAME || rc.authUsername || 'admin',
    authPassword: e.AUTH_PASSWORD || '',
    sessionSecret: e.SESSION_SECRET || '',
    cookieSecure: e.COOKIE_SECURE || '',
    agentTlsVerify: e.AGENT_TLS_VERIFY || '',
    trustedProxyHops: e.TRUSTED_PROXY_HOPS || '0',
    sessionMaxAgeHours: e.SESSION_MAX_AGE_HOURS || '12',
    storageType: e.STORAGE_TYPE || 'local',
    storageLocalPath: e.STORAGE_LOCAL_PATH || './data',
    s3Bucket: e.S3_BUCKET || '',
    s3Region: e.S3_REGION || 'us-east-1',
    s3Endpoint: e.S3_ENDPOINT || '',
    s3AccessKeyId: e.S3_ACCESS_KEY_ID || '',
    s3SecretAccessKey: e.S3_SECRET_ACCESS_KEY || '',
    s3ForcePathStyle: e.S3_FORCE_PATH_STYLE || '',
  }
}
