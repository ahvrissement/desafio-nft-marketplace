import { Link } from '@tanstack/react-router'

import { NftCarousel } from '@/features/catalog/components/nft-carousel'

// Skeleton do detalhe: as mesmas caixas e medidas da página pronta. Quando os
// dados chegam, cada bloco ocupa exatamente o lugar do seu "fantasma" (CLS = 0).
// Inclui as abas e o carrossel: sem eles a página "crescia" ao carregar, e o
// rodapé, que aparecia na tela durante o skeleton, era empurrado (CLS 0,2).
export function NftDetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-12 lg:gap-24 lg:pt-8">
      <span className="sr-only" role="status">
        Carregando NFT…
      </span>
      <div aria-hidden className="lg:page-container">
        <div className="mb-3 hidden h-4 w-36 rounded-sm skeleton-shimmer lg:block" />
        <div className="lg:grid lg:grid-cols-[573px_1fr] lg:items-start lg:gap-8">
          {/* Galeria */}
          <div className="hidden grid-cols-[100px_444px] gap-7 lg:grid">
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="size-25 rounded-[10px] skeleton-shimmer" />
              ))}
            </div>
            <div className="mt-0.5 size-111 rounded-[10px] bg-card p-5">
              <div className="size-full rounded-[20px] skeleton-shimmer" />
            </div>
          </div>
          <div className="bg-surface-raised px-7 pt-5.75 lg:hidden">
            <div className="h-8.75" />
            <div className="mt-2 aspect-[361/356] w-full rounded-[20px] skeleton-shimmer" />
          </div>

          {/* Informações */}
          <div className="relative z-10 -mt-7.5 flex flex-col gap-4 rounded-t-[30px] bg-card px-6 pt-8 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0">
            <div className="h-6 w-3/5 rounded-sm skeleton-shimmer lg:h-9.25" />
            <div className="hidden h-5 w-full rounded-sm skeleton-shimmer lg:block" />
            <div className="h-18 w-full rounded-sm skeleton-shimmer" />
            <div className="h-14 w-52 rounded-sm skeleton-shimmer" />
            <div className="hidden h-12.5 w-full rounded-sm skeleton-shimmer lg:block" />
            <div className="h-21 w-3/4 rounded-sm skeleton-shimmer" />
          </div>
        </div>
      </div>

      {/* Abas: a altura medida na página pronta (o texto tem tamanho parecido em todo NFT) */}
      <div aria-hidden className="page-container h-168 lg:h-90">
        <div className="h-8 w-full border-b border-border" />
        <div className="mt-4 h-40 w-full rounded-sm skeleton-shimmer" />
      </div>

      <div aria-hidden>
        <NftCarousel title="Mais desta coleção" items={undefined} isPending />
      </div>
    </div>
  )
}

export function NftNotFound() {
  return (
    <div className="page-container flex flex-col items-start gap-4 py-16 lg:py-24">
      <title>NFT não encontrado | Kurio</title>
      <p className="text-sm font-bold text-text-accent uppercase">Erro 404</p>
      <h1 className="text-2xl font-bold lg:text-[28px]">NFT não encontrado</h1>
      <p className="max-w-xl text-text-secondary">
        Este NFT não existe ou foi removido do mercado. Confira o endereço ou explore o catálogo.
      </p>
      <Link to="/" hash="mercado" className="mt-2 rounded-[5px] bg-primary px-6 py-3 font-bold text-ink hover:bg-text-accent">
        Explorar o mercado
      </Link>
    </div>
  )
}

export function NftLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="page-container flex flex-col items-start gap-4 py-16 lg:py-24">
      <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
      <p className="text-text-secondary">Verifique sua conexão e tente de novo.</p>
      <button type="button" onClick={onRetry} className="rounded-[5px] bg-primary px-6 py-3 font-bold text-ink">
        Tentar de novo
      </button>
    </div>
  )
}
