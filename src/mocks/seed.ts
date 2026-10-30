import {
  NETWORK_LABELS,
  type Category,
  type Network,
  type Nft,
  type NftEdition,
  type NftImage,
} from '@/contracts/nft'
import { multiplyEth, percentOfEth } from '@/lib/money'

// Dados iniciais do "banco" falso.
//
// Os 9 primeiros NFTs são exatamente os do Figma. Os outros são gerados por um
// gerador pseudoaleatório com SEMENTE fixa: parece aleatório, mas produz sempre
// a mesma sequência. Isso é essencial para testes: "o 3º item custa 1.99" precisa
// ser verdade em toda execução.

// mulberry32: um gerador pseudoaleatório minúsculo e conhecido.
function createRandom(seed: number) {
  let state = seed
  const next = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)]
  return { next, int, pick }
}

type Random = ReturnType<typeof createRandom>

// As 4 artes que existem no Figma. Cada uma representa uma coleção.
const ARTWORKS = {
  brown: {
    file: 'ape-brown',
    collection: 'Kurio Apes',
    alt: 'macaco marrom de óculos escuros redondos e jaqueta college verde',
    attributes: ['Óculos', 'Esmeralda', 'Jaqueta college'],
  },
  gray: {
    file: 'ape-gray',
    collection: 'Nomad Club',
    alt: 'macaco cinza de chapéu bucket verde e moletom roxo',
    attributes: ['Chapéu bucket', 'Moletom', 'Sereno'],
  },
  black: {
    file: 'ape-black',
    collection: 'Ivory Society',
    alt: 'macaco preto de blazer bege e gola alta verde',
    attributes: ['Blazer', 'Gola alta', 'Elegante'],
  },
  golden: {
    file: 'ape-golden',
    collection: 'Golden Frequency',
    alt: 'macaco dourado com fones de ouvido verdes',
    attributes: ['Fones', 'Dourado', 'Ritmo'],
  },
} as const
type Artwork = keyof typeof ARTWORKS

const RARITIES = ['Comum', 'Incomum', 'Raro', 'Lendário'] as const

interface SeedInput {
  name: string
  artwork: Artwork
  price: string
  compareAtPrice?: string
  category: Category
  network: Network
  featured?: boolean
  rarity?: (typeof RARITIES)[number]
  rating?: number
  reviewCount?: number
  salesCount?: number
  royaltyBps?: number
}

const FIGMA_NFTS: SeedInput[] = [
  { name: 'Emerald Ape #042', artwork: 'brown', price: '1.19', category: 'arte-digital', network: 'ethereum', rarity: 'Raro', rating: 5, reviewCount: 19, salesCount: 84, royaltyBps: 500 },
  { name: 'Sage Nomad #009', artwork: 'gray', price: '1.69', category: 'colecionaveis', network: 'ethereum', featured: true, salesCount: 71 },
  { name: 'Neon Vessel #552', artwork: 'black', price: '1.99', compareAtPrice: '2.29', category: 'arte-3d', network: 'polygon', salesCount: 66 },
  { name: 'Cosmic Bloom #118', artwork: 'gray', price: '1.29', category: 'generativa', network: 'solana' },
  { name: 'Violet Nomad #314', artwork: 'gray', price: '1.39', category: 'arte-digital', network: 'polygon' },
  { name: 'Ivory Baron #088', artwork: 'black', price: '1.79', category: 'colecionaveis', network: 'ethereum' },
  { name: 'Golden Beat #207', artwork: 'golden', price: '0.99', category: 'musica', network: 'solana' },
  // O Figma tem um card sem nome nesta posição; demos um.
  { name: 'Golden Echo #121', artwork: 'golden', price: '0.79', category: 'musica', network: 'polygon' },
  { name: 'Golden Signal #160', artwork: 'golden', price: '0.39', category: 'musica', network: 'ethereum' },
]

const ADJECTIVES = ['Amber', 'Crimson', 'Lunar', 'Rust', 'Velvet', 'Onyx', 'Copper', 'Solar', 'Jade', 'Dusk', 'Mint', 'Cobalt']
const NOUNS = ['Drifter', 'Monarch', 'Pilot', 'Oracle', 'Rider', 'Scholar', 'Wanderer', 'Keeper', 'Echo', 'Voyager']
const CATEGORY_POOL: Category[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'colecionaveis', 'generativa', 'jogos', 'assinaturas', 'utilidade']
const NETWORK_POOL: Network[] = ['ethereum', 'polygon', 'solana']
const GENERATED_COUNT = 39 // 9 do Figma + 39 = 48 NFTs = 6 páginas de 9

// Preço em centavos de ETH → string. 1230 → "12.30". Inteiros evitam o problema do float.
function centsToEth(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

function generatedInputs(random: Random): SeedInput[] {
  const used = new Set(FIGMA_NFTS.map((nft) => nft.name))
  const inputs: SeedInput[] = []
  while (inputs.length < GENERATED_COUNT) {
    const name = `${random.pick(ADJECTIVES)} ${random.pick(NOUNS)} #${String(random.int(1, 999)).padStart(3, '0')}`
    if (used.has(name)) continue
    used.add(name)
    // Os dois primeiros fixam os extremos da faixa de preço do Figma (0.02 a 12.30 ETH).
    const cents = inputs.length === 0 ? 1230 : inputs.length === 1 ? 2 : random.int(2, 1230)
    inputs.push({
      name,
      artwork: random.pick(Object.keys(ARTWORKS) as Artwork[]),
      price: centsToEth(cents),
      category: random.pick(CATEGORY_POOL),
      network: random.pick(NETWORK_POOL),
    })
  }
  return inputs
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function hex(random: Random, length: number): string {
  return Array.from({ length }, () => random.int(0, 15).toString(16)).join('')
}

// O Figma mostra 4 miniaturas da mesma arte na galeria; seguimos o mesmo.
function galleryImages(name: string, artwork: Artwork): NftImage[] {
  const { file, alt } = ARTWORKS[artwork]
  return Array.from({ length: 4 }, (_, index) => ({
    alt: index === 0 ? `${name}: ${alt}` : `${name}, imagem ${index + 1} de 4`,
    small: `/nfts/${file}-400.webp`,
    large: `/nfts/${file}-800.webp`,
  }))
}

// As 4 edições do Figma. A 1/50 é a padrão (é a que aparece selecionada).
function editionsFor(price: string, random: Random): NftEdition[] {
  return [
    { id: '1-1', label: '1/1', supply: 1, available: random.next() < 0.5 ? 1 : 0, price: multiplyEth(price, 5) },
    { id: '1-10', label: '1/10', supply: 10, available: random.int(0, 10), price: multiplyEth(price, 2) },
    { id: '1-50', label: '1/50', supply: 50, available: random.int(3, 50), price },
    { id: 'open', label: 'Aberta', supply: null, available: null, price: percentOfEth(price, 5_000) },
  ]
}

const NEWEST_LISTING = Date.UTC(2026, 9, 28, 12) // 28/10/2026
const HOURS_BETWEEN_LISTINGS = 36

function buildNft(input: SeedInput, index: number, random: Random): Nft {
  const art = ARTWORKS[input.artwork]
  const royaltyBps = input.royaltyBps ?? random.int(5, 20) * 50 // 2,5% a 10%
  const networkLabel = NETWORK_LABELS[input.network]
  const number = input.name.split('#')[1]
  return {
    id: slugify(input.name),
    name: input.name,
    tokenId: `#${number.padStart(4, '0')}`,
    collection: art.collection,
    category: input.category,
    network: input.network,
    summary: `Um colecionável digital finalizado à mão da coleção ${art.collection}, verificado na ${networkLabel}, com arte desbloqueável e acesso para colecionadores.`,
    description: [
      `${input.name} é uma obra digital finalizada à mão da coleção ${art.collection}. Cada atributo fica armazenado nos metadados do token e verificado na ${networkLabel}.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência na rede. O criador recebe ${royaltyBps / 100}% de direitos autorais nas vendas secundárias.`,
    ],
    attributes: [...art.attributes.slice(0, 2), input.rarity ?? random.pick(RARITIES)],
    contractAddress: `0x${hex(random, 40)}`,
    royaltyBps,
    images: galleryImages(input.name, input.artwork),
    editions: editionsFor(input.price, random),
    defaultEditionId: '1-50',
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? null,
    rating: input.rating ?? random.int(35, 50) / 10,
    reviewCount: input.reviewCount ?? random.int(0, 40),
    salesCount: input.salesCount ?? random.int(0, 120),
    featured: input.featured ?? false,
    listedAt: new Date(NEWEST_LISTING - index * HOURS_BETWEEN_LISTINGS * 3_600_000).toISOString(),
    version: 1,
  }
}

// Função (e não constante) para cada reset ganhar objetos novos,
// sem nenhuma alteração anterior "vazando" por referência.
export function createSeedNfts(): Nft[] {
  const random = createRandom(42)
  const inputs = [...FIGMA_NFTS, ...generatedInputs(random)]
  return inputs.map((input, index) => buildNft(input, index, random))
}
