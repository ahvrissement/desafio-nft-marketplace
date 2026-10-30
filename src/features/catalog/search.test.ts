import { describe, expect, it } from 'vitest'

import { catalogSearchSchema, toListQuery } from './search'

describe('catalogSearchSchema (parâmetros da URL)', () => {
  it('preenche os padrões quando a URL está vazia', () => {
    expect(catalogSearchSchema.parse({})).toEqual({ tab: 'all', sort: 'recent', page: 1 })
  })

  it('troca valores inválidos pelo padrão em vez de lançar erro', () => {
    const search = catalogSearchSchema.parse({
      page: 'abc',
      sort: 'mais-barato',
      tab: 0,
      network: ['marte'],
      minPrice: '1,5',
    })
    expect(search).toEqual({ tab: 'all', sort: 'recent', page: 1 })
  })

  it('mantém os valores válidos', () => {
    const search = catalogSearchSchema.parse({ q: ' ape ', network: ['solana'], page: 3, sort: 'price-asc' })
    expect(search).toMatchObject({ q: 'ape', network: ['solana'], page: 3, sort: 'price-asc' })
  })
})

describe('toListQuery (URL → API)', () => {
  it('descarta busca vazia e faixa de preço invertida', () => {
    const query = toListQuery(catalogSearchSchema.parse({ q: '', minPrice: '5', maxPrice: '1' }))
    expect(query).toMatchObject({ q: undefined, minPrice: undefined, maxPrice: undefined })
  })
})
