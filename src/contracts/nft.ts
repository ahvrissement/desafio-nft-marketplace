import { z } from 'zod'

import { compareEth } from '@/lib/money'

import { ethAmountSchema, paginated } from './common'

// ---------------------------------------------------------------------------
// Valores fixos (os filtros da sidebar do Figma)
// ---------------------------------------------------------------------------

// "as const" deixa o TypeScript enxergar os valores literais ('ethereum' | 'polygon' | ...)
// em vez de só string. É a alternativa a enum (que nossa config de TS proíbe).
export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(NETWORKS)
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const CATEGORIES = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export const categorySchema = z.enum(CATEGORIES)
export type Category = z.infer<typeof categorySchema>

export const CATEGORY_LABELS: Record<Category, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

// Raridade: vira o selo "RARO" nos cards do mobile e entra nos atributos do detalhe.
export const RARITIES = ['Comum', 'Incomum', 'Raro', 'Lendário'] as const
export const raritySchema = z.enum(RARITIES)
export type Rarity = z.infer<typeof raritySchema>

// Abas acima do grid ("Todos os NFTs", "Novos lançamentos", "Em alta")
export const NFT_TABS = ['all', 'new', 'trending'] as const
export const nftTabSchema = z.enum(NFT_TABS)
export type NftTab = z.infer<typeof nftTabSchema>

// "Ordenar por"
export const NFT_SORTS = ['recent', 'price-asc', 'price-desc'] as const
export const nftSortSchema = z.enum(NFT_SORTS)
export type NftSort = z.infer<typeof nftSortSchema>

export const NFT_SORT_LABELS: Record<NftSort, string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
}

// ---------------------------------------------------------------------------
// O NFT
// ---------------------------------------------------------------------------

export const nftImageSchema = z.object({
  // Texto alternativo é obrigatório no contrato: acessibilidade começa nos dados.
  alt: z.string().min(1),
  small: z.string(), // 400px, para cards
  large: z.string(), // 800px, para a página de detalhe
})
export type NftImage = z.infer<typeof nftImageSchema>

// Opções de "Edição" na tela de detalhe: 1/1, 1/10, 1/50, ABERTA.
// Cada edição tem preço e estoque próprios.
export const nftEditionSchema = z.object({
  id: z.string(),
  label: z.string(),
  supply: z.number().int().positive().nullable(), // null = edição aberta (tiragem ilimitada)
  available: z.number().int().nonnegative().nullable(), // null = sem limite de estoque
  price: ethAmountSchema,
})
export type NftEdition = z.infer<typeof nftEditionSchema>

export const nftSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  tokenId: z.string(), // "#0042"
  collection: z.string(),
  category: categorySchema,
  network: networkSchema,
  summary: z.string(), // "Sobre este NFT"
  description: z.array(z.string()), // parágrafos da aba "Detalhes do NFT"
  attributes: z.array(z.string()),
  rarity: raritySchema,
  contractAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  royaltyBps: z.number().int().min(0).max(10_000), // 500 = 5%
  images: z.array(nftImageSchema).min(1),
  editions: z.array(nftEditionSchema).min(1),
  defaultEditionId: z.string(),
  // Preço exibido nos cards = preço da edição padrão.
  price: ethAmountSchema,
  // Preço "de" riscado, quando há desconto (Neon Vessel: 1.99 de 2.29).
  compareAtPrice: ethAmountSchema.nullable(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  salesCount: z.number().int().nonnegative(),
  featured: z.boolean(),
  listedAt: z.iso.datetime(),
  // Aumenta a cada alteração. O Socket.IO envia a versão junto com o evento,
  // e o front ignora eventos com versão <= à que já tem (duplicados ou atrasados).
  version: z.number().int().positive(),
})
export type Nft = z.infer<typeof nftSchema>

// Versão "enxuta" para os cards do catálogo: só o que o card precisa.
// Listar 9 NFTs com descrição, edições e todas as imagens seria desperdício de rede.
export const nftSummarySchema = nftSchema
  .pick({
    id: true,
    name: true,
    collection: true,
    category: true,
    network: true,
    price: true,
    compareAtPrice: true,
    rarity: true,
    featured: true,
    version: true,
  })
  .extend({ image: nftImageSchema })
export type NftSummary = z.infer<typeof nftSummarySchema>

// ---------------------------------------------------------------------------
// GET /api/nfts: parâmetros e resposta
// ---------------------------------------------------------------------------

export const NFT_PAGE_SIZE = 9 // grid 3×3 do Figma

// Os parâmetros chegam pela query string, onde tudo é texto.
// z.coerce.number() converte "2" em 2 antes de validar.
// category e network são de MÚLTIPLA escolha (no Figma são checkboxes):
// ?category=musica&category=arte-3d → ['musica', 'arte-3d'].
export const nftListQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    category: z.array(categorySchema).optional(),
    network: z.array(networkSchema).optional(),
    minPrice: ethAmountSchema.optional(),
    maxPrice: ethAmountSchema.optional(),
    tab: nftTabSchema.default('all'),
    sort: nftSortSchema.default('recent'),
    page: z.coerce.number().int().min(1).default(1),
  })
  // Validação que envolve DOIS campos: não dá para expressar campo a campo.
  .refine((query) => !query.minPrice || !query.maxPrice || compareEth(query.minPrice, query.maxPrice) <= 0, {
    message: 'O preço mínimo não pode ser maior que o máximo',
    path: ['minPrice'],
  })
// z.input = o que pode ENTRAR (campos com default são opcionais);
// z.infer = o que SAI depois do parse (defaults já preenchidos).
export type NftListQueryInput = z.input<typeof nftListQuerySchema>
export type NftListQuery = z.infer<typeof nftListQuerySchema>

export const nftListResponseSchema = paginated(nftSummarySchema)
export type NftListResponse = z.infer<typeof nftListResponseSchema>

// GET /api/nfts/facets: contagens e faixa de preço para a sidebar.
const facetSchema = <T extends z.ZodType>(value: T) =>
  z.object({ value, label: z.string(), count: z.number().int().nonnegative() })

export const nftFacetsSchema = z.object({
  categories: z.array(facetSchema(categorySchema)),
  networks: z.array(facetSchema(networkSchema)),
  priceRange: z.object({ min: ethAmountSchema, max: ethAmountSchema }),
})
export type NftFacets = z.infer<typeof nftFacetsSchema>
