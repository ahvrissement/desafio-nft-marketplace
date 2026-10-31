import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { BackButton } from '@/components/back-button'
import { NftCarousel } from '@/features/catalog/components/nft-carousel'
import { catalogQueries } from '@/features/catalog/queries'

import { useCart } from '../use-cart'
import { CartItems } from './cart-items'
import { CartSummary } from './cart-summary'

export function CartPage() {
  const { data: cart, isPending, isError, refetch } = useCart()

  return (
    <div className="flex flex-col gap-24 lg:pt-8">
      <title>Carrinho | Kurio</title>
      <div className="page-container">
        <nav aria-label="Trilha de navegação" className="mb-3 hidden lg:block">
          <ol className="flex gap-2 text-[15px] leading-4 font-medium">
            <li>
              <Link to="/" className="hover:text-text-accent">Início</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="mercado" activeOptions={{ includeHash: true }} className="hover:text-text-accent">Mercado</Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">Carrinho</li>
          </ol>
        </nav>

        {/* Mobile: "← Carrinho de NFTs" */}
        <div className="relative flex items-center justify-center pt-6 pb-5 lg:hidden">
          <BackButton className="absolute left-0" />
          <h1 className="text-lg leading-6 font-bold">Carrinho de NFTs</h1>
        </div>
        {/* Desktop: o Figma não mostra título; o h1 existe só para o leitor de tela */}
        <h1 className="sr-only max-lg:hidden">Carrinho</h1>

        {/* Erro primeiro; depois "ainda sem carrinho" (sessão ou GET pendentes).
            O !cart também ensina o TypeScript que, dali em diante, cart existe. */}
        {isError ? (
          <div role="alert" className="flex flex-col items-start gap-4 py-12">
            <p className="text-text-secondary">Não foi possível carregar seu carrinho.</p>
            <button type="button" onClick={() => void refetch()} className="rounded-[5px] bg-primary px-6 py-3 font-bold text-ink">
              Tentar de novo
            </button>
          </div>
        ) : isPending || !cart ? (
          <CartSkeleton />
        ) : cart.items.length === 0 ? (
          <EmptyCart />
        ) : (
          // Desktop: tabela (782px) + 86px + resumo, como no Figma.
          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[782px_1fr] lg:items-start lg:gap-21.5">
            <div>
              <CartItems items={cart.items} />
            </div>
            {/* Mobile: o resumo sangra até as bordas da tela (folha do Figma) */}
            <div className="-mx-6 lg:mx-0">
              <CartSummary cart={cart} />
            </div>
          </div>
        )}
      </div>

      <Recommendations excludeIds={cart?.items.map((item) => item.nftId) ?? []} />
    </div>
  )
}

// "Colecionadores também viram": os NFTs em alta, sem os que já estão no carrinho.
function Recommendations({ excludeIds }: { excludeIds: string[] }) {
  const { data, isPending, isError } = useQuery(catalogQueries.list({ tab: 'trending' }))
  const items = data?.items.filter((nft) => !excludeIds.includes(nft.id))
  return <NftCarousel title="Colecionadores também viram" items={isError ? [] : items} isPending={isPending} />
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-xl font-bold">Seu carrinho está vazio</h2>
      <p className="max-w-md text-text-secondary">Explore o mercado e adicione os NFTs que quiser colecionar.</p>
      <Link to="/" hash="mercado" className="mt-2 rounded-[5px] bg-primary px-6 py-3 font-bold text-ink hover:bg-text-accent">
        Explorar o mercado
      </Link>
    </div>
  )
}

// Mesmas medidas da tela pronta: linhas de 70px (desktop) e cards de 100px (mobile).
function CartSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8 lg:grid lg:grid-cols-[782px_1fr] lg:gap-21.5">
      <span role="status" className="sr-only">Carregando carrinho…</span>
      <div aria-hidden className="flex flex-col gap-3 lg:pt-10">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-25 rounded-[16px] skeleton-shimmer lg:h-17.5 lg:rounded-none" />
        ))}
      </div>
      <div aria-hidden className="flex flex-col gap-4">
        <div className="hidden h-6 w-48 rounded-sm skeleton-shimmer lg:block" />
        <div className="h-12.5 rounded-full skeleton-shimmer lg:h-10 lg:rounded-sm" />
        <div className="h-36 rounded-sm skeleton-shimmer" />
        <div className="h-15 rounded-full skeleton-shimmer lg:h-10 lg:rounded-sm" />
      </div>
    </div>
  )
}
