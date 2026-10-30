import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { nftFacetsSchema, nftListResponseSchema, nftSchema, type NftListResponse } from '@/contracts/nft'
import { compareEth } from '@/lib/money'

import { resetDb } from '../db'
import { createSeedNfts } from '../seed'
import { nftHandlers } from './nfts'

// No Node, o MSW intercepta o fetch/http do próprio Node (não há service worker).
// Os handlers são os MESMOS do navegador.
const server = setupServer(...nftHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => resetDb()) // cada teste começa do cenário conhecido

async function get(path: string) {
  const response = await fetch(`http://localhost/api${path}`)
  return { status: response.status, body: await response.json() }
}

async function list(query = ''): Promise<NftListResponse> {
  const { status, body } = await get(`/nfts${query}`)
  expect(status).toBe(200)
  return nftListResponseSchema.parse(body)
}

describe('seed', () => {
  it('gera 48 NFTs válidos, com ids únicos, sempre iguais', () => {
    const nfts = createSeedNfts()
    expect(nfts).toHaveLength(48)
    for (const nft of nfts) nftSchema.parse(nft)
    expect(new Set(nfts.map((nft) => nft.id)).size).toBe(48)
    expect(createSeedNfts()).toEqual(nfts) // determinístico
  })
})

describe('GET /api/nfts', () => {
  it('pagina de 9 em 9, começando pelos do Figma', async () => {
    const page1 = await list()
    expect(page1).toMatchObject({ page: 1, pageSize: 9, total: 48, totalPages: 6 })
    expect(page1.items.map((nft) => nft.name).slice(0, 3)).toEqual([
      'Emerald Ape #042',
      'Sage Nomad #009',
      'Neon Vessel #552',
    ])

    const page6 = await list('?page=6')
    expect(page6.items).toHaveLength(3)
  })

  it('busca sem diferenciar maiúsculas', async () => {
    const result = await list('?q=EMERALD')
    expect(result.items.map((nft) => nft.id)).toContain('emerald-ape-042')
  })

  it('busca também pelo nome da coleção', async () => {
    const result = await list('?q=golden frequency')
    expect(result.total).toBeGreaterThan(0)
    expect(result.items.every((nft) => nft.collection === 'Golden Frequency')).toBe(true)
  })

  it('filtra por rede e faixa de preço (inclusiva)', async () => {
    const result = await list('?network=solana&minPrice=0.5&maxPrice=1.29')
    expect(result.total).toBeGreaterThan(0)
    for (const nft of result.items) {
      expect(nft.network).toBe('solana')
      expect(compareEth(nft.price, '0.5')).toBeGreaterThanOrEqual(0)
      expect(compareEth(nft.price, '1.29')).toBeLessThanOrEqual(0)
    }
  })

  it('aceita várias categorias e redes ao mesmo tempo', async () => {
    const result = await list('?category=musica&category=arte-3d&network=ethereum&network=polygon')
    expect(result.total).toBeGreaterThan(0)
    for (const nft of result.items) {
      expect(['musica', 'arte-3d']).toContain(nft.category)
      expect(['ethereum', 'polygon']).toContain(nft.network)
    }
  })

  it('ordena por preço', async () => {
    const { items } = await list('?sort=price-asc')
    const prices = items.map((nft) => nft.price)
    expect(prices).toEqual(prices.toSorted(compareEth))
    expect(prices[0]).toBe('0.02')
  })

  it('responde 400 com o campo exato quando o parâmetro é inválido', async () => {
    const { status, body } = await get('/nfts?page=0')
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.fieldErrors).toHaveProperty('page')
  })

  it('rejeita preço mínimo maior que o máximo', async () => {
    const { status, body } = await get('/nfts?minPrice=5&maxPrice=1')
    expect(status).toBe(400)
    expect(body.error.fieldErrors).toHaveProperty('minPrice')
  })
})

describe('GET /api/nfts/:id', () => {
  it('retorna o NFT completo', async () => {
    const { status, body } = await get('/nfts/emerald-ape-042')
    expect(status).toBe(200)
    const nft = nftSchema.parse(body)
    expect(nft).toMatchObject({ price: '1.19', collection: 'Kurio Apes', reviewCount: 19 })
    expect(nft.editions.map((edition) => edition.label)).toEqual(['1/1', '1/10', '1/50', 'Aberta'])
  })

  it('responde 404 no formato padrão de erro', async () => {
    const { status, body } = await get('/nfts/nao-existe')
    expect(status).toBe(404)
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'NFT não encontrado.' } })
  })
})

describe('GET /api/nfts/facets', () => {
  it('conta cada categoria e rede e devolve a faixa de preço do Figma', async () => {
    const { body } = await get('/nfts/facets')
    const facets = nftFacetsSchema.parse(body)
    const sum = (items: { count: number }[]) => items.reduce((total, item) => total + item.count, 0)
    expect(sum(facets.categories)).toBe(48)
    expect(sum(facets.networks)).toBe(48)
    expect(facets.priceRange).toEqual({ min: '0.02', max: '12.30' })
  })
})
