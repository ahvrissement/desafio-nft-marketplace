import { useState, type ReactNode } from 'react'

import searchIcon from '@/assets/icons/search.svg'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { NftImage } from '@/contracts/nft'
import { useSwipe } from '@/hooks/use-swipe'

interface NftGalleryProps {
  name: string
  images: NftImage[]
  // Botões "voltar" e "favoritar" que ficam por cima da galeria no mobile
  mobileTopBar: ReactNode
}

// Galeria do detalhe ("Product Images" no Figma).
//   Desktop: 4 miniaturas à esquerda + imagem principal com lupa (zoom).
//   Mobile: uma imagem por vez, trocada por arrasto ou pelos pontos.
// As duas versões dividem o mesmo estado: a imagem ativa.
export function NftGallery({ name, images, mobileTopBar }: NftGalleryProps) {
  const [active, setActive] = useState(0)
  const total = images.length
  const goTo = (index: number) => setActive((index + total) % total)
  const swipe = useSwipe({ onNext: () => goTo(active + 1), onPrevious: () => goTo(active - 1) })
  const current = images[active]

  // A mesma <img> aparece no layout desktop e no mobile (um deles fica com
  // display:none). Como `srcSet` e `sizes` são idênticos, o navegador escolhe o
  // mesmo arquivo para os dois e baixa uma vez só.
  const mainImage = (className: string) => (
    <img
      src={current.large}
      srcSet={`${current.small} 400w, ${current.large} 800w`}
      sizes="(min-width: 1024px) 404px, 92vw"
      width={800}
      height={800}
      alt={current.alt}
      // É o LCP desta tela: baixa primeiro e sem lazy.
      fetchPriority="high"
      className={className}
    />
  )

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <div className="hidden grid-cols-[100px_444px] items-start gap-7 lg:grid">
        <div role="group" aria-label="Imagens do NFT" className="flex flex-col gap-4">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Mostrar imagem ${index + 1} de ${total}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className="overflow-hidden rounded-[10px] border border-transparent aria-pressed:border-primary hover:border-primary/60"
            >
              <img src={image.small} width={400} height={400} alt="" loading="lazy" className="size-25 object-cover" />
            </button>
          ))}
        </div>

        <div className="relative mt-0.5 size-111 rounded-[10px] bg-card p-5">
          {mainImage('size-full rounded-[20px] object-cover')}
          <ZoomDialog name={name} image={current} index={active} total={total} />
        </div>
      </div>

      {/* ---------- Mobile ---------- */}
      <div className="bg-surface-raised px-7 pt-5.75 lg:hidden">
        {mobileTopBar}
        <div className="relative mt-2" {...swipe}>
          {mainImage('aspect-[361/356] w-full rounded-[20px] object-cover')}
          <div role="group" aria-label="Imagens do NFT" className="absolute bottom-10.5 left-1/2 flex -translate-x-1/2">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Mostrar imagem ${index + 1} de ${total}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className="group grid size-6 place-items-center"
              >
                <span className="size-1.75 rounded-full bg-primary opacity-40 group-aria-pressed:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

interface ZoomDialogProps {
  name: string
  image: NftImage
  index: number
  total: number
}

// A lupa do Figma. O Dialog (Radix, via shadcn) prende o foco dentro dele,
// fecha com Esc ou clique fora e devolve o foco à lupa ao fechar.
function ZoomDialog({ name, image, index, total }: ZoomDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Ampliar imagem"
        className="absolute top-3.25 right-3 grid size-7.5 place-items-center rounded-full bg-card hover:bg-surface-raised"
      >
        <img src={searchIcon} alt="" className="size-4" />
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,800px)] max-w-none gap-3 bg-card p-3 sm:max-w-none">
        <DialogTitle className="pr-8 text-base">{name}</DialogTitle>
        <DialogDescription className="sr-only">
          Imagem {index + 1} de {total} ampliada.
        </DialogDescription>
        <img src={image.large} width={800} height={800} alt={image.alt} className="w-full rounded-[20px]" />
      </DialogContent>
    </Dialog>
  )
}
