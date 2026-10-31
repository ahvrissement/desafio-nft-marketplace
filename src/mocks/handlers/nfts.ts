import { delay, http } from 'msw'

import {
  CATEGORIES,
  CATEGORY_LABELS,
  featuredNftResponseSchema,
  NETWORKS,
  NETWORK_LABELS,
  NFT_PAGE_SIZE,
  NFT_RELATED_LIMIT,
  nftFacetsSchema,
  nftListQuerySchema,
  nftListResponseSchema,
  nftRelatedResponseSchema,
  nftReviewsResponseSchema,
  nftSchema,
  type Nft,
  type NftListQuery,
  type NftSort,
  type NftSummary,
} from '@/contracts/nft'
import { compareEth } from '@/lib/money'

import { readDb } from '../db'
import { createSeedReviews } from '../seed'
import { API, apiError, json, validationError } from '../utils'

const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // "Novos lançamentos" = listados nos últimos 14 dias
const TRENDING_MIN_SALES = 60 // "Em alta" = 60+ vendas

// "Café" e "cafe", "APE" e "ape" precisam encontrar o mesmo resultado.
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

// Object.fromEntries pegaria só o ÚLTIMO valor de um parâmetro repetido.
// category e network podem vir várias vezes (?network=ethereum&network=solana).
function searchParamsToObject(searchParams: URLSearchParams) {
  const all = (key: string) => {
    const values = searchParams.getAll(key)
    return values.length > 0 ? values : undefined
  }
  return { ...Object.fromEntries(searchParams), category: all('category'), network: all('network') }
}

function filterNfts(nfts: readonly Nft[], query: NftListQuery): Nft[] {
  // "Recente" é relativo ao NFT mais novo do banco, não à data de hoje.
  // Assim o resultado não muda conforme o dia em que o teste roda.
  const newest = Math.max(...nfts.map((nft) => Date.parse(nft.listedAt)))
  const term = query.q ? normalize(query.q) : ''

  return nfts.filter((nft) => {
    if (term && !normalize(`${nft.name} ${nft.collection}`).includes(term)) return false
    if (query.category && !query.category.includes(nft.category)) return false
    if (query.network && !query.network.includes(nft.network)) return false
    if (query.minPrice && compareEth(nft.price, query.minPrice) < 0) return false
    if (query.maxPrice && compareEth(nft.price, query.maxPrice) > 0) return false
    if (query.tab === 'new' && newest - Date.parse(nft.listedAt) > NEW_WINDOW_MS) return false
    if (query.tab === 'trending' && nft.salesCount < TRENDING_MIN_SALES) return false
    return true
  })
}

function sortNfts(nfts: Nft[], sort: NftSort): Nft[] {
  switch (sort) {
    case 'price-asc':
      return nfts.toSorted((a, b) => compareEth(a.price, b.price))
    case 'price-desc':
      return nfts.toSorted((a, b) => compareEth(b.price, a.price))
    case 'recent':
      return nfts.toSorted((a, b) => b.listedAt.localeCompare(a.listedAt))
  }
}

export function toSummary(nft: Nft): NftSummary {
  return {
    id: nft.id,
    name: nft.name,
    collection: nft.collection,
    category: nft.category,
    network: nft.network,
    price: nft.price,
    compareAtPrice: nft.compareAtPrice,
    rarity: nft.rarity,
    featured: nft.featured,
    version: nft.version,
    image: nft.images[0],
  }
}

export const nftHandlers = [
  // GET /api/nfts?q=&category=&network=&minPrice=&maxPrice=&tab=&sort=&page=
  http.get(`${API}/nfts`, async ({ request }) => {
    await delay() // latência "realista" (100–400ms) no navegador; zero nos testes

    // A query string vira um objeto ({ page: "2", sort: "price-asc" }) e passa pelo
    // MESMO schema que o front usa. Parâmetro inválido → 400 com o campo exato.
    const parsed = nftListQuerySchema.safeParse(searchParamsToObject(new URL(request.url).searchParams))
    if (!parsed.success) return validationError(parsed.error)

    const query = parsed.data
    const matches = sortNfts(filterNfts(readDb().nfts, query), query.sort)
    const start = (query.page - 1) * NFT_PAGE_SIZE

    return json(nftListResponseSchema, {
      items: matches.slice(start, start + NFT_PAGE_SIZE).map(toSummary),
      page: query.page,
      pageSize: NFT_PAGE_SIZE,
      total: matches.length,
      totalPages: Math.ceil(matches.length / NFT_PAGE_SIZE),
    })
  }),

  // Precisa vir ANTES de /nfts/:id. O MSW usa o primeiro handler que casar,
  // e "facets" casaria com :id.
  http.get(`${API}/nfts/facets`, async () => {
    await delay()
    const { nfts } = readDb()
    const prices = nfts.map((nft) => nft.price).sort(compareEth)

    return json(nftFacetsSchema, {
      categories: CATEGORIES.map((value) => ({
        value,
        label: CATEGORY_LABELS[value],
        count: nfts.filter((nft) => nft.category === value).length,
      })),
      networks: NETWORKS.map((value) => ({
        value,
        label: NETWORK_LABELS[value],
        count: nfts.filter((nft) => nft.network === value).length,
      })),
      priceRange: { min: prices[0], max: prices[prices.length - 1] },
    })
  }),

  // Também antes de /nfts/:id, pelo mesmo motivo. Se houver mais de um destaque,
  // vale o listado mais recentemente.
  http.get(`${API}/nfts/featured`, async () => {
    await delay()
    const [featured] = sortNfts(
      readDb().nfts.filter((nft) => nft.featured),
      'recent',
    )
    return json(featuredNftResponseSchema, { item: featured ? toSummary(featured) : null })
  }),

  http.get(`${API}/nfts/:id`, async ({ params }) => {
    await delay()
    const nft = readDb().nfts.find((item) => item.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return json(nftSchema, nft)
  }),

  // Rotas com mais um segmento ("/nfts/x/reviews") não colidem com /nfts/:id.
  http.get(`${API}/nfts/:id/reviews`, async ({ params }) => {
    await delay()
    const nft = readDb().nfts.find((item) => item.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return json(nftReviewsResponseSchema, { items: createSeedReviews(nft) })
  }),

  // "Mais desta coleção": primeiro a mesma coleção, depois os mais recentes do
  // catálogo para completar a vitrine. Nunca inclui o próprio NFT.
  http.get(`${API}/nfts/:id/related`, async ({ params }) => {
    await delay()
    const { nfts } = readDb()
    const nft = nfts.find((item) => item.id === params.id)
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    const others = sortNfts(
      nfts.filter((item) => item.id !== nft.id),
      'recent',
    )
    const related = [
      ...others.filter((item) => item.collection === nft.collection),
      ...others.filter((item) => item.collection !== nft.collection),
    ]
    return json(nftRelatedResponseSchema, { items: related.slice(0, NFT_RELATED_LIMIT).map(toSummary) })
  }),
]
