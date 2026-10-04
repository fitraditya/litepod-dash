/** Split a command line into args, honoring "double" and 'single' quotes and backslash escapes
 *  (outside single quotes). `sh -c "echo hi"` -> ['sh', '-c', 'echo hi']. */
export function splitShellWords(input: string): string[] {
  const out: string[] = []
  let cur = ''
  let has = false
  let quote: '"' | "'" | null = null
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (quote) {
      if (ch === quote) quote = null
      else if (ch === '\\' && quote === '"' && i + 1 < input.length && '"\\'.includes(input[i + 1]!)) cur += input[++i]
      else cur += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      has = true
    } else if (ch === '\\' && i + 1 < input.length) {
      cur += input[++i]
      has = true
    } else if (/\s/.test(ch)) {
      if (has || cur) out.push(cur)
      cur = ''
      has = false
    } else {
      cur += ch
      has = true
    }
  }
  if (has || cur) out.push(cur)
  return out
}

/** Inverse of splitShellWords: quote args that need it so a round trip is lossless. */
export function joinShellWords(args: string[]): string {
  return args
    .map((a) => (a === '' || /[\s"'\\]/.test(a) ? `"${a.replace(/(["\\])/g, '\\$1')}"` : a))
    .join(' ')
}
