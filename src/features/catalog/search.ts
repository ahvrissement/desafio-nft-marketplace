import { z } from 'zod'

import { ethAmountSchema } from '@/contracts/common'
import {
  categorySchema,
  networkSchema,
  nftSortSchema,
  nftTabSchema,
  type NftListQueryInput,
} from '@/contracts/nft'
import { compareEth } from '@/lib/money'

// Parâmetros de busca da Home, lidos da URL: /?q=ape&network=["ethereum"]&page=2
//
// Mesmos tipos e valores do contrato da API (passo 2), mas com OUTRA política para
// valores inválidos. A API responde 400, porque quem chama precisa saber que errou.
// A URL usa .catch(): alguém colou um link quebrado (?page=abc) e a tela não pode
// explodir por isso; o valor inválido cai silenciosamente no padrão.

export const CATALOG_DEFAULTS = { tab: 'all', sort: 'recent', page: 1 } as const

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.array(categorySchema).optional().catch(undefined),
  network: z.array(networkSchema).optional().catch(undefined),
  minPrice: ethAmountSchema.optional().catch(undefined),
  maxPrice: ethAmountSchema.optional().catch(undefined),
  tab: nftTabSchema.default(CATALOG_DEFAULTS.tab).catch(CATALOG_DEFAULTS.tab),
  sort: nftSortSchema.default(CATALOG_DEFAULTS.sort).catch(CATALOG_DEFAULTS.sort),
  page: z.number().int().min(1).default(CATALOG_DEFAULTS.page).catch(CATALOG_DEFAULTS.page),
})
export type CatalogSearch = z.infer<typeof catalogSearchSchema>

// URL → parâmetros da API. Remove o que a API recusaria (400) e que, vindo da URL,
// deve ser só ignorado: busca vazia, listas vazias e faixa de preço invertida.
export function toListQuery(search: CatalogSearch): NftListQueryInput {
  const priceInverted =
    search.minPrice !== undefined &&
    search.maxPrice !== undefined &&
    compareEth(search.minPrice, search.maxPrice) > 0

  return {
    q: search.q || undefined,
    category: search.category?.length ? search.category : undefined,
    network: search.network?.length ? search.network : undefined,
    minPrice: priceInverted ? undefined : search.minPrice,
    maxPrice: priceInverted ? undefined : search.maxPrice,
    tab: search.tab,
    sort: search.sort,
    page: search.page,
  }
}

// Há algum filtro aplicado? (para o botão "Limpar filtros")
export function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(
    search.q || search.category?.length || search.network?.length || search.minPrice || search.maxPrice,
  )
}
