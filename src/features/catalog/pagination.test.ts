import { describe, expect, it } from 'vitest'

import { pageWindow } from './pagination'

describe('pageWindow', () => {
  it('mostra todas as páginas quando são poucas', () => {
    expect(pageWindow(1, 6)).toEqual([1, 2, 3, 4, 5, 6])
    expect(pageWindow(1, 1)).toEqual([1])
    expect(pageWindow(1, 0)).toEqual([])
  })

  it('resume com "gap" quando são muitas', () => {
    expect(pageWindow(5, 12)).toEqual([1, 'gap', 4, 5, 6, 'gap', 12])
    expect(pageWindow(1, 12)).toEqual([1, 2, 'gap', 12])
    expect(pageWindow(12, 12)).toEqual([1, 'gap', 11, 12])
  })
})
