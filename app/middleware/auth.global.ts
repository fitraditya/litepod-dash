export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  try {
    const fetch = import.meta.server ? useRequestFetch() : $fetch
    await fetch('/api/auth/me')
  } catch {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
