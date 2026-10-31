import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NETWORK_LABELS, type Nft } from '@/contracts/nft'

import { nftQueries } from '../queries'
import { RatingStars } from './rating-stars'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

// "0x7a42...19e8": o endereço inteiro (42 caracteres) não cabe e não é lido por ninguém.
const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

const TOKEN_STANDARD = { ethereum: 'ERC-721', polygon: 'ERC-721', solana: 'Metaplex' } as const

// Abas "Detalhes do NFT" e "Avaliações de colecionadores".
// Aqui SÃO abas ARIA (role="tab"), ao contrário do catálogo: cada aba controla
// um painel. O Radix (via shadcn) entrega setas do teclado, aria-selected e
// aria-controls ligando aba e painel.
export function NftInfoTabs({ nft }: { nft: Nft }) {
  const [tab, setTab] = useState('details')

  const triggerClass =
    'h-auto flex-none rounded-none border-0 px-0 pb-3 text-base leading-4 font-medium text-foreground hover:text-text-accent data-active:font-bold data-active:text-text-accent data-active:after:bottom-0 data-active:after:bg-primary lg:text-lg'

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <TabsList variant="line" className="h-auto w-full justify-start gap-8 border-b border-border p-0">
        <TabsTrigger value="details" className={triggerClass}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="reviews" className={triggerClass}>
          {/* No celular o texto inteiro não cabe (estourava a largura da tela) */}
          <span className="lg:hidden">Avaliações ({nft.reviewCount})</span>
          <span className="hidden lg:inline">Avaliações de colecionadores ({nft.reviewCount})</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="pt-4 text-sm leading-6 text-text-secondary">
        {nft.description.map((paragraph) => (
          <p key={paragraph} className="mb-6 last:mb-0">
            {paragraph}
          </p>
        ))}
        {/* No Figma os textos de "Contrato" e "Direitos autorais" estão trocados;
            aqui cada rótulo descreve o próprio conteúdo. */}
        <dl className="mt-3 flex flex-col gap-3">
          <InfoItem label="Rede">
            Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.
          </InfoItem>
          <InfoItem label="Contrato">
            <span translate="no">{shortAddress(nft.contractAddress)}</span> • Contrato inteligente{' '}
            {TOKEN_STANDARD[nft.network]} verificado.
          </InfoItem>
          <InfoItem label="Direitos autorais">
            Direitos autorais do criador: {nft.royaltyBps / 100}% nas vendas secundárias, pagos automaticamente pelos
            mercados compatíveis.
          </InfoItem>
        </dl>
      </TabsContent>

      <TabsContent value="reviews" className="pt-4">
        <Reviews nftId={nft.id} enabled={tab === 'reviews'} />
      </TabsContent>
    </Tabs>
  )
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[15px] font-bold text-foreground">{label}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

// Só busca quando a aba é aberta (`enabled`): quem nunca clica em
// "Avaliações" não gasta essa requisição.
function Reviews({ nftId, enabled }: { nftId: string; enabled: boolean }) {
  const { data: reviews, isPending, isError, refetch } = useQuery({ ...nftQueries.reviews(nftId), enabled })

  if (isPending) {
    return (
      <ul aria-busy="true" aria-label="Carregando avaliações" className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <li key={index} className="h-24 rounded-lg skeleton-shimmer" />
        ))}
      </ul>
    )
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 text-sm">
        <p className="text-text-secondary">Não foi possível carregar as avaliações.</p>
        <button type="button" onClick={() => void refetch()} className="font-bold text-text-accent underline">
          Tentar de novo
        </button>
      </div>
    )
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-text-secondary">Este NFT ainda não tem avaliações.</p>
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {reviews.map((review) => (
        <li key={review.id}>
          <article className="flex h-full flex-col gap-2 rounded-lg bg-card p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold">{review.author}</h3>
              <RatingStars rating={review.rating} size={13} />
            </header>
            <p className="text-sm leading-6 text-text-secondary">{review.comment}</p>
            <time dateTime={review.createdAt} className="text-xs text-text-subtle">
              {dateFormat.format(new Date(review.createdAt))}
            </time>
          </article>
        </li>
      ))}
    </ul>
  )
}
