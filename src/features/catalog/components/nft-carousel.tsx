import { useEffect, useId, useRef, useState } from 'react'

import type { NftSummary } from '@/contracts/nft'
import { cn } from '@/lib/utils'

import { NftCard, NftCardSkeleton } from './nft-card'

// Largura de cada card: 5 por "página" no desktop (26px entre eles, como no
// Figma), 3 no tablet e 2 no celular.
const itemClass = 'w-[calc((100%-16px)/2)] shrink-0 snap-start md:w-[calc((100%-2*16px)/3)] lg:w-[calc((100%-4*26px)/5)]'

interface NftCarouselProps {
  title: string
  items: NftSummary[] | undefined
  isPending: boolean
}

// Vitrine horizontal ("Mais desta coleção", "Colecionadores também viram"),
// com CSS scroll-snap. O próprio navegador cuida de arrastar, inércia e
// encaixe; os pontos só acompanham a rolagem e, ao clicar, rolam até a
// "página" escolhida.
export function NftCarousel({ title, items, isPending }: NftCarouselProps) {
  const titleId = useId()
  const trackRef = useRef<HTMLUListElement>(null)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(0)

  // Quantas páginas cabem depende da largura da tela: recalcula ao redimensionar.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => {
      setPages(Math.max(1, Math.round(track.scrollWidth / track.clientWidth)))
      setPage(Math.round(track.scrollLeft / track.clientWidth))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(track)
    track.addEventListener('scroll', update, { passive: true })
    // Limpeza: sem isso, cada visita a um NFT deixaria um observer vivo.
    return () => {
      observer.disconnect()
      track.removeEventListener('scroll', update)
    }
  }, [items])

  // Sem itens (ou falha, que chega aqui como items vazio): a seção some. Não é
  // conteúdo essencial, e um erro aqui não deve competir com a compra.
  if (!isPending && !items?.length) return null

  const goToPage = (index: number) => {
    const track = trackRef.current
    if (!track) return
    // "smooth" vira instantâneo para quem pediu menos movimento no sistema.
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({ left: index * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' })
  }

  return (
    <section aria-labelledby={titleId} className="page-container">
      <h2 id={titleId} className="border-b border-border pb-3 text-base leading-4 font-bold text-text-accent">
        {title}
      </h2>

      <ul
        ref={trackRef}
        aria-busy={isPending}
        className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] lg:gap-6.5"
      >
        {isPending || !items
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} className={itemClass}>
                <NftCardSkeleton />
              </li>
            ))
          : items.map((nft) => (
              <li key={nft.id} className={itemClass}>
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>

      {pages > 1 && (
        <div role="group" aria-label={`Páginas: ${title}`} className="mt-6 flex justify-center gap-0.5">
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Página ${index + 1} de ${pages}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => goToPage(index)}
              className="group grid size-6 place-items-center"
            >
              <span
                className={cn(
                  'size-3 rounded-full border border-primary',
                  index === page ? 'bg-primary' : 'group-hover:bg-primary/40',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
