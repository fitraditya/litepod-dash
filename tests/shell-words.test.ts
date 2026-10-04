import { describe, expect, it } from 'vitest'
import { joinShellWords, splitShellWords } from '../app/utils/shell-words'

describe('shell words', () => {
  it('splits plain and quoted args', () => {
    expect(splitShellWords('nginx -g daemon')).toEqual(['nginx', '-g', 'daemon'])
    expect(splitShellWords(`sh -c "echo hi there"`)).toEqual(['sh', '-c', 'echo hi there'])
    expect(splitShellWords(`sh -c 'a "b" c' ""`)).toEqual(['sh', '-c', 'a "b" c', ''])
    expect(splitShellWords('  ')).toEqual([])
  })
  it('round-trips', () => {
    for (const args of [['sh', '-c', 'echo "hi" && ls'], ['a b', '', 'c\\d']]) {
      expect(splitShellWords(joinShellWords(args))).toEqual(args)
    }
  })
})
