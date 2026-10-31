import { Link, getRouteApi, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import heartOutlineIcon from '@/assets/icons/heart-outline.svg'
import heartFilledIcon from '@/assets/icons/tab-heart.svg'
import starIcon from '@/assets/icons/star.svg'
import shopIcon from '@/assets/icons/tab-shop.svg'
import { BackButton } from '@/components/back-button'
import { MaskIcon } from '@/components/mask-icon'
import { QuantityStepper } from '@/components/quantity-stepper'
import { MAX_QUANTITY_PER_ORDER, maxQuantityFor, type Nft } from '@/contracts/nft'
import { useCartActions } from '@/features/cart/use-cart'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { formatEth, multiplyEth } from '@/lib/money'
import { circleButtonClass } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'

import { editionAvailabilityText, formatRating } from '../format'
import { EditionPicker } from './edition-picker'
import { NftGallery } from './nft-gallery'
import { NftInfoTabs } from './nft-info-tabs'
import { RatingStars } from './rating-stars'
import { RelatedNfts } from './related-nfts'
import { ShareLinks } from './share-links'

const route = getRouteApi('/nft/$id')

export function NftDetail({ nft }: { nft: Nft }) {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  // A edição vem da URL (?edition=1-10): o link compartilhado abre já com ela,
  // e o F5 não perde a escolha. Valor desconhecido → edição padrão.
  const edition =
    nft.editions.find((item) => item.id === search.edition) ??
    nft.editions.find((item) => item.id === nft.defaultEditionId) ??
    nft.editions[0]
  const soldOut = edition.available === 0
  const maxQuantity = Math.max(1, maxQuantityFor(edition))

  // A quantidade é estado local, mas é sempre "presa" ao máximo da edição atual.
  // Trocar de 1/50 (10 por pedido) para 1/10 com 3 em estoque faz 8 virar 3,
  // sem precisar de um useEffect para "corrigir" o estado.
  const [rawQuantity, setQuantity] = useState(1)
  const quantity = Math.min(rawQuantity, maxQuantity)
  const atLimit = !soldOut && quantity >= maxQuantity

  const selectEdition = (id: string) =>
    void navigate({
      // Na edição padrão, tira o parâmetro: URL limpa ("/nft/x" e não "/nft/x?edition=1-50")
      search: { edition: id === nft.defaultEditionId ? undefined : id },
      replace: true, // trocar de edição não deveria encher o histórico do "voltar"
      resetScroll: false,
    })

  // "Comprar": adiciona e vai para o carrinho. Ícone de carrinho (mobile):
  // adiciona e fica. O estoque é conferido de novo pela API (409 = aviso).
  const { add } = useCartActions()
  const goTo = useNavigate()
  const addToCart = (then: 'go' | 'stay') =>
    add.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          if (then === 'go') void goTo({ to: '/cart' })
          else toast.success(`${nft.name} (${edition.label}) foi para o carrinho.`, { action: { label: 'Ver carrinho', onClick: () => void goTo({ to: '/cart' }) } })
        },
      },
    )

  // Preço "de" só faz sentido na edição padrão (é o preço dos cards).
  const compareAtPrice = edition.id === nft.defaultEditionId ? nft.compareAtPrice : null
  const path = `/nft/${nft.id}`

  return (
    <div className="flex flex-col gap-12 lg:gap-24 lg:pt-8">
      {/* React 19: <title> dentro do componente vai direto para o <head> */}
      <title>{`${nft.name} | Kurio`}</title>

      <div className="lg:page-container">
        <nav aria-label="Trilha de navegação" className="mb-3 hidden lg:block">
          <ol className="flex gap-2 text-[15px] leading-4 font-medium">
            <li>
              <Link to="/" className="hover:text-text-accent">
                Início
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="mercado" activeOptions={{ includeHash: true }} className="hover:text-text-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-[573px_1fr] lg:items-start lg:gap-8">
          <NftGallery name={nft.name} images={nft.images} mobileTopBar={<MobileTopBar nft={nft} />} />

          {/* Mobile: "folha" que sobe por cima da imagem (Details Sheet do Figma) */}
          <section
            aria-labelledby="nft-titulo"
            className="relative z-10 -mt-7.5 flex flex-col rounded-t-[30px] bg-card px-6 pt-8 pb-6 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0"
          >
            <div className="flex items-center justify-between gap-3 lg:block">
              <h1 id="nft-titulo" className="text-lg leading-6 font-bold lg:text-[28px] lg:leading-9.25">
                {nft.name}
              </h1>
              {/* Mobile: selo "★ 4,8 (19)" */}
              <p className="flex h-6.75 shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-[13px] lg:hidden">
                <MaskIcon src={starIcon} width={14} height={14} className="text-primary" />
                <span className="sr-only">Nota </span>
                <span className="font-bold">{formatRating(nft.rating)}</span>
                <span className="text-text-secondary">
                  ({nft.reviewCount}
                  <span className="sr-only"> avaliações</span>)
                </span>
              </p>
            </div>

            <div className="mt-3 hidden items-center justify-between gap-4 border-b border-border pb-3 lg:flex">
              <Price price={edition.price} compareAtPrice={compareAtPrice} />
              <div className="flex items-center gap-1">
                <RatingStars rating={nft.rating} />
                <span className="text-[15px]">{nft.reviewCount} avaliações de colecionadores</span>
              </div>
            </div>

            <h2 className="mt-3 hidden text-[15px] leading-4 font-bold lg:block">Sobre este NFT:</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary lg:mt-1.5">{nft.summary}</p>

            <EditionPicker
              editions={nft.editions}
              selectedId={edition.id}
              onSelect={selectEdition}
              hint={
                // Muda junto com a edição: aria-live faz o leitor de tela anunciar.
                // Fica na linha das opções para não empurrar o layout do Figma.
                <span
                  aria-live="polite"
                  className={cn('text-xs lg:ml-2', soldOut ? 'font-bold text-destructive' : 'text-text-subtle')}
                >
                  {editionAvailabilityText(edition)}
                </span>
              }
              className="mt-3 lg:mt-3.25"
            />

            {/* Desktop: quantidade + COMPRAR + Favoritar */}
            <div className="relative mt-3.25 hidden items-center justify-between gap-4 lg:flex">
              <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} />
              {/* Posição absoluta: aparece no espaço entre as linhas, sem empurrar nada */}
              <QuantityLimitMessage show={atLimit} max={maxQuantity} className="absolute top-full left-0" />
              <div className="flex gap-2">
                <BuyButton soldOut={soldOut} pending={add.isPending} onClick={() => addToCart('go')} className="h-10 w-32.5 rounded-[5px] text-sm uppercase">
                  Comprar
                </BuyButton>
                <FavoriteButton nft={nft} />
              </div>
            </div>

            <dl className="mt-3 flex flex-col gap-3 text-[15px] leading-5 text-text-secondary lg:mt-3.25">
              <TokenInfo label="ID do token" value={nft.tokenId} />
              <TokenInfo label="Coleção" value={nft.collection} />
              <TokenInfo label="Atributos" value={nft.attributes.join(', ')} />
            </dl>
            <ShareLinks name={nft.name} path={path} className="mt-1" />
          </section>
        </div>
      </div>

      <section aria-label="Informações do NFT" className="page-container">
        <NftInfoTabs nft={nft} />
      </section>

      <RelatedNfts nftId={nft.id} />

      {/* Mobile: barra de compra fixa no rodapé ("Buy Bar" do Figma) */}
      <div className="fixed inset-x-0 bottom-0 z-20 rounded-t-[30px] bg-card px-6 pt-5 pb-6 shadow-[0_-8px_24px_rgb(0_0_0/0.35)] lg:hidden">
        <div className="flex items-center justify-between">
          <QuantityStepper size="sm" label="Qtd" value={quantity} max={maxQuantity} onChange={setQuantity} />
          <p className="text-xl leading-4 font-bold text-text-accent">
            <span className="sr-only">Total: </span>
            {formatEth(multiplyEth(edition.price, quantity))}
          </p>
        </div>
        <QuantityLimitMessage show={atLimit} max={maxQuantity} />
        <div className="mt-5 flex gap-3">
          <BuyButton soldOut={soldOut} pending={add.isPending} onClick={() => addToCart('go')} className="h-15 w-49 rounded-full bg-linear-to-r from-primary to-[#b07440] text-base">
            Comprar NFT
          </BuyButton>
          <button
            type="button"
            disabled={soldOut || add.isPending}
            onClick={() => addToCart('stay')}
            aria-label={`Adicionar ${nft.name} ao carrinho`}
            className="grid size-15 place-items-center rounded-full bg-surface-raised text-text-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <img src={shopIcon} alt="" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Price({ price, compareAtPrice }: { price: string; compareAtPrice: string | null }) {
  return (
    <p className="flex items-baseline gap-3 text-[22px] leading-4 font-bold text-text-accent">
      <span className="sr-only">Preço: </span>
      {formatEth(price)}
      {compareAtPrice && (
        <>
          <span className="sr-only">, preço anterior: </span>
          <s className="text-base font-normal text-text-subtle no-underline">{formatEth(compareAtPrice)}</s>
        </>
      )}
    </p>
  )
}

function TokenInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt>{label}:</dt>
      <dd>{value}</dd>
    </div>
  )
}

function QuantityLimitMessage({ show, max, className }: { show: boolean; max: number; className?: string }) {
  return (
    // role="status" fica sempre no DOM (vazio quando não há limite): assim o
    // leitor de tela anuncia a mensagem no instante em que ela aparece.
    <p role="status" className={cn('mt-0.5 min-h-3.5 text-xs leading-3.5 text-text-subtle', className)}>
      {show &&
        (max === MAX_QUANTITY_PER_ORDER
          ? `Limite de ${MAX_QUANTITY_PER_ORDER} unidades por pedido.`
          : `Você já escolheu todas as ${max} unidades disponíveis.`)}
    </p>
  )
}

interface BuyButtonProps {
  soldOut: boolean
  pending: boolean
  onClick: () => void
  className?: string
  children: string
}

function BuyButton({ soldOut, pending, onClick, className, children }: BuyButtonProps) {
  return (
    <button
      type="button"
      // Esgotada: `disabled` de verdade (não há o que fazer). Enviando: também,
      // para um clique duplo não adicionar duas vezes.
      disabled={soldOut || pending}
      onClick={onClick}
      className={cn('bg-primary font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60', className)}
    >
      {soldOut ? 'Esgotada' : pending ? 'Adicionando…' : children}
    </button>
  )
}

// "Favoritar" ↔ "Favoritado": o texto muda junto com o coração, então o estado
// não depende da cor. aria-pressed avisa o leitor de tela.
function FavoriteButton({ nft }: { nft: Nft }) {
  const favorites = useToggleFavorite()
  const favorite = favorites.isFavorite(nft.id)
  return (
    <button
      type="button"
      aria-pressed={favorite}
      onClick={() => favorites.toggle(nft.id, nft.name)}
      className={cn(
        'flex h-10 w-32.5 items-center justify-center gap-2 rounded-[5px] border border-primary text-[15px] font-bold',
        favorite ? 'bg-primary/15 text-text-accent' : 'text-text-accent hover:bg-primary/10',
      )}
    >
      <MaskIcon src={favorite ? heartFilledIcon : heartOutlineIcon} width={20} height={17.8} />
      {favorite ? 'Favoritado' : 'Favoritar'}
    </button>
  )
}

function MobileTopBar({ nft }: { nft: Nft }) {
  const favorites = useToggleFavorite()
  const favorite = favorites.isFavorite(nft.id)

  return (
    <div className="flex items-center justify-between">
      <BackButton />
      <button
        type="button"
        aria-label={`Favoritar ${nft.name}`}
        aria-pressed={favorite}
        onClick={() => favorites.toggle(nft.id, nft.name)}
        className={cn(circleButtonClass, 'text-text-accent')}
      >
        <MaskIcon src={favorite ? heartFilledIcon : heartOutlineIcon} width={16} height={14.2} />
      </button>
    </div>
  )
}
