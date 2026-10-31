import { Link } from '@tanstack/react-router'

import heartOutlineIcon from '@/assets/icons/heart-outline.svg'
import heartFilledIcon from '@/assets/icons/tab-heart.svg'
import { MaskIcon } from '@/components/mask-icon'
import type { NftSummary } from '@/contracts/nft'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

// Moldura do card. É compartilhada com o skeleton: os dois têm SEMPRE o mesmo
// tamanho, então trocar um pelo outro não desloca o layout (CLS = 0).
//   Mobile: caixa arredondada com gradiente; imagem 4px das laterais e 12px do topo.
//   Desktop: retângulo liso; imagem centralizada com 25px em cima e embaixo.
const cardFrameClass = cn(
  'relative overflow-hidden rounded-[20px] bg-linear-[139.54deg] from-card from-12% to-surface-raised to-[106.59%] px-1 pt-3 pb-5',
  'lg:rounded-none lg:bg-card lg:bg-none lg:py-6.25',
)
const cardImageClass = 'aspect-square w-full rounded-2xl lg:rounded-[15px]'

// Selo "RARO" do mobile: só para as raridades altas.
const BADGE_RARITIES = new Set(['Raro', 'Lendário'])

interface NftCardProps {
  nft: NftSummary
  // A primeira linha de cards aparece sem rolar a página: carrega na frente
  // (ajuda no LCP). O resto só carrega perto de entrar na tela.
  priority?: boolean
  // O coração aparece só no mobile (Figma). Na página de favoritos, também no
  // desktop: lá, desfavoritar é a ação principal.
  favoriteOnDesktop?: boolean
}

export function NftCard({ nft, priority = false, favoriteOnDesktop = false }: NftCardProps) {
  const favorites = useToggleFavorite()
  const favorite = favorites.isFavorite(nft.id)

  return (
    <article className="relative flex flex-col gap-2 lg:gap-3">
      <div className={cardFrameClass}>
        <img
          src={nft.image.small}
          srcSet={`${nft.image.small} 400w, ${nft.image.large} 800w`}
          // O navegador escolhe o arquivo: ~250px de largura no desktop, ~45% da tela no mobile.
          sizes="(min-width: 1024px) 250px, 45vw"
          width={400}
          height={400}
          alt={nft.image.alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={cn(cardImageClass, 'object-cover')}
        />

        {BADGE_RARITIES.has(nft.rarity) && (
          <span className="absolute top-4 left-0 flex h-8 min-w-17 items-center bg-primary px-2 text-[13px] leading-4 font-medium text-ink uppercase lg:hidden">
            {nft.rarity}
          </span>
        )}
      </div>

      {/* Favoritar (só no mobile, como no Figma). Fica acima do link do card (z-10),
          então tocar no coração não abre o NFT. aria-pressed diz se já é favorito;
          o coração cheio/vazio garante que o estado não depende só da cor. */}
      <button
        type="button"
        aria-label={`Favoritar ${nft.name}`}
        aria-pressed={favorite}
        onClick={() => favorites.toggle(nft.id, nft.name)}
        className={cn(
          'absolute top-3 right-3 z-10 grid size-7 place-items-center rounded-full border border-border bg-surface-raised text-primary after:absolute after:-inset-2',
          favoriteOnDesktop ? 'lg:top-8 lg:right-5 lg:size-8' : 'lg:hidden',
        )}
      >
        <MaskIcon src={favorite ? heartFilledIcon : heartOutlineIcon} width={15} height={13.35} />
      </button>

      <div className="flex flex-col pl-2 lg:gap-3 lg:pl-0">
        <h3 className="text-[15px] leading-5 lg:text-base lg:leading-4">
          {/* "Link esticado": o ::after cobre o card inteiro, então clicar em qualquer
              ponto abre o NFT, mas só existe UM link para o leitor de tela e o Tab. */}
          <Link to="/nft/$id" params={{ id: nft.id }} className="after:absolute after:inset-0 hover:text-text-accent">
            {nft.name}
          </Link>
        </h3>
        {/* flex-wrap + nowrap: se não couber, o preço anterior desce inteiro para a linha
            de baixo, em vez de quebrar no meio ("1.99 / ETH") */}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base leading-4 whitespace-nowrap lg:text-lg">
          <span className="sr-only">Preço: </span>
          <span className="font-bold text-text-accent">{formatEth(nft.price)}</span>
          {nft.compareAtPrice && (
            <>
              <span className="sr-only">, preço anterior: </span>
              {/* <s> = "não vale mais". O Figma não risca, então tiramos a linha no CSS. */}
              <s className="text-text-subtle no-underline">{formatEth(nft.compareAtPrice)}</s>
            </>
          )}
        </p>
      </div>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2 lg:gap-3">
      <div className={cardFrameClass}>
        <div className={cn(cardImageClass, 'skeleton-shimmer')} />
      </div>
      <div className="flex flex-col gap-1 pl-2 lg:gap-3 lg:pl-0">
        <div className="h-5 w-3/4 rounded-sm skeleton-shimmer lg:h-4" />
        <div className="h-4 w-1/3 rounded-sm skeleton-shimmer" />
      </div>
    </div>
  )
}
