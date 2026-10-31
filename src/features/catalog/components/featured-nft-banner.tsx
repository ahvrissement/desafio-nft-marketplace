import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { formatEth } from '@/lib/money'

import { catalogQueries } from '../queries'

// "Featured NFT Banner" do Figma, na sidebar abaixo dos filtros (só desktop).
// O NFT vem da API (GET /api/nfts/featured), não de um texto fixo: quando o
// preço mudar via Socket.IO, o banner atualiza junto com o card do catálogo.
export function FeaturedNftBanner() {
  const { data: nft, isPending, isError, refetch } = useQuery(catalogQueries.featured())

  // Nenhum NFT em destaque no momento: a sidebar fica só com os filtros.
  if (nft === null) return null

  return (
    <section aria-labelledby="destaque-titulo" className="relative overflow-hidden bg-card pt-6">
      <h2 id="destaque-titulo" className="px-5 text-2xl leading-8 font-bold text-text-accent uppercase">
        NFT em destaque
      </h2>
      <p className="mt-4 px-5 text-center text-[22px] leading-4 font-bold uppercase">Oferta limitada</p>

      <div className="mt-4 h-92 overflow-hidden rounded-t-[20px]">
        {isPending ? (
          <div aria-hidden className="size-full skeleton-shimmer" />
        ) : isError ? (
          <div role="alert" className="flex size-full flex-col items-center justify-center gap-4 px-5 text-center">
            <p className="text-sm text-text-secondary">Não foi possível carregar o destaque.</p>
            <button type="button" onClick={() => void refetch()} className="text-sm font-bold text-text-accent underline">
              Tentar de novo
            </button>
          </div>
        ) : (
          <Link to="/nft/$id" params={{ id: nft.id }} className="group block size-full">
            <span className="sr-only">
              Ver {nft.name}, {formatEth(nft.price)}
            </span>
            <img
              src={nft.image.small}
              srcSet={`${nft.image.small} 400w, ${nft.image.large} 800w`}
              sizes="310px"
              width={800}
              height={800}
              alt="" // o texto do link já nomeia o NFT
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}
      </div>

      {/* Quadradinhos translúcidos sobre a arte ("Rectangle 30/31/32" no Figma) */}
      <div aria-hidden className="pointer-events-none">
        <span className="absolute top-26.25 left-9.5 size-3.75 rounded-sm bg-white/15" />
        <span className="absolute top-74.75 left-4 size-5.5 rounded-md bg-white/15" />
        <span className="absolute top-85.75 left-62 size-11.25 rounded-lg bg-white/15" />
      </div>
    </section>
  )
}
