<script setup lang="ts">
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const route = useRoute()

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    const redirect = (route.query.redirect as string) || '/'
    await navigateTo(redirect)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="card" @submit.prevent="submit">
      <div class="brand">
        <span class="brand-mark">D</span>
        <h1>dashpod</h1>
      </div>
      <label>
        Username
        <input v-model="username" name="username" autocomplete="username" required />
      </label>
      <label>
        Password
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
        />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="primary" type="submit" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}
.card {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.brand-mark {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
.error {
  color: var(--danger);
  font-size: 13px;
}
h1 {
  margin: 0;
  font-size: 18px;
}
</style>
