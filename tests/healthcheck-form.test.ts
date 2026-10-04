import { describe, expect, it, vi } from 'vitest'

// `reactive` is a Nuxt auto-import; plain objects are enough here.
vi.stubGlobal('reactive', <T>(o: T) => o)
const shell = await import('../app/utils/shell-words')
vi.stubGlobal('splitShellWords', shell.splitShellWords)
vi.stubGlobal('joinShellWords', shell.joinShellWords)

async function hc(text: string) {
  const { emptyForm, formToConfig } = await import('../app/composables/useContainerForm')
  const f = emptyForm()
  f.image = 'x'
  f.healthcheck_test = text
  return formToConfig(f).healthcheck?.test
}

describe('healthcheck test parsing', () => {
  it('keeps the CMD-SHELL command as a single element', async () => {
    expect(await hc('CMD-SHELL pg_isready -U postgres')).toEqual(['CMD-SHELL', 'pg_isready -U postgres'])
  })
  it('splits exec-form CMD per argument', async () => {
    expect(await hc('CMD curl -f http://x')).toEqual(['CMD', 'curl', '-f', 'http://x'])
  })
})
