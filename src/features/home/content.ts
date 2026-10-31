import type { NftTab } from '@/contracts/nft'

// Conteúdo fixo da Home (marketing e editorial).
//
// Não é "resposta fictícia" de API: são textos de vitrine, que num projeto real
// viriam de um CMS, não do backend do marketplace. Tudo que é DADO de NFT
// (preço, estoque, destaque) vem da API mockada.

const art = (file: string) => ({ small: `/nfts/${file}-400.webp`, large: `/nfts/${file}-800.webp` })

export interface HeroSlide {
  kicker: string
  title: { desktop: string; mobile: string }
  description: { desktop: string; mobile: string }
  // Para onde o "Explorar" leva: o catálogo, já com a aba escolhida na URL.
  tab: NftTab
  // Desktop mostra só a principal; o mobile sobrepõe a secundária (como no Figma).
  images: { main: ReturnType<typeof art>; accent: ReturnType<typeof art> }
}

// O Figma desenha só o primeiro slide (os 3 pontos indicam mais dois).
// Os outros reaproveitam os temas das Promos, com o mesmo padrão visual.
export const HERO_SLIDES: HeroSlide[] = [
  {
    kicker: 'Bem-vindo à Kurio',
    title: { desktop: 'Seja dono do futuro da arte digital', mobile: 'Seja dono da cultura digital' },
    description: {
      desktop:
        'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
      mobile: 'Descubra NFTs selecionados de criadores do mundo todo.',
    },
    tab: 'all',
    images: { main: art('ape-brown'), accent: art('ape-gray') },
  },
  {
    kicker: 'Novos lançamentos',
    title: { desktop: 'Edições gênesis antes de todo mundo', mobile: 'Edições gênesis primeiro' },
    description: {
      desktop:
        'Colecione edições escassas diretamente dos criadores antes da revelação pública. Os lançamentos mais recentes do mercado, em um só lugar.',
      mobile: 'Edições escassas direto dos criadores, antes da revelação.',
    },
    tab: 'new',
    images: { main: art('ape-golden'), accent: art('ape-brown') },
  },
  {
    kicker: 'Em alta',
    title: { desktop: 'A arte que está movendo o mercado', mobile: 'O que está em alta' },
    description: {
      desktop:
        'Explore novos artistas, coleções verificadas e as obras digitais mais negociadas da semana. Veja o que os colecionadores estão disputando.',
      mobile: 'As obras mais negociadas da semana.',
    },
    tab: 'trending',
    images: { main: art('ape-black'), accent: art('ape-golden') },
  },
]

export interface Promo {
  title: string // "\n" = quebra de linha do Figma no desktop
  description: string
  tab: NftTab
  image: string
}

export const PROMOS: Promo[] = [
  {
    title: 'Lançamentos gênesis\nde edição limitada',
    description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    tab: 'new',
    image: art('ape-brown').small,
  },
  {
    title: 'Arte digital selecionada\ne muito mais',
    description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    tab: 'trending',
    image: art('ape-black').small,
  },
]

export interface BlogPost {
  title: string
  excerpt: string
  publishedAt: string // ISO (vai no <time dateTime>)
  readingMinutes: number
  image: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    publishedAt: '2026-09-12',
    readingMinutes: 6,
    image: art('ape-black').small,
  },
  {
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a cultura digital.',
    publishedAt: '2026-09-13',
    readingMinutes: 2,
    image: art('ape-brown').small,
  },
  {
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    publishedAt: '2026-09-15',
    readingMinutes: 3,
    image: art('ape-gray').small,
  },
  {
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seus ativos e sua identidade.',
    publishedAt: '2026-09-15',
    readingMinutes: 2,
    image: art('ape-golden').small,
  },
]
