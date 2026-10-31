import { useQuery } from '@tanstack/react-query'
import { Link, Navigate } from '@tanstack/react-router'

import { authQueries } from '@/features/auth/queries'
import { useSession } from '@/features/auth/use-session'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'

// "Meus favoritos" (a "Lista de interesse" do Figma). Desfavoritar aqui usa o
// mesmo useToggleFavorite dos cards: otimista, e a lista se atualiza sozinha
// porque a chave dela fica debaixo de ['me', userId, 'favorites'].
export function FavoritesPage() {
  const { user, isPending } = useSession()
  if (!isPending && !user) return <Navigate to="/" replace /> // saiu da conta aqui dentro
  return (
    <div className="page-container pt-8 pb-12">
      <title>Meus favoritos | Kurio</title>
      <h1 className="mb-8 text-2xl font-bold">Meus favoritos</h1>
      {user && <FavoritesGrid userId={user.id} />}
    </div>
  )
}

const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8.5 lg:gap-y-12'

function FavoritesGrid({ userId }: { userId: string }) {
  const { data: items, isPending, isError, refetch } = useQuery(authQueries.favoriteNfts(userId))

  if (isPending) {
    return (
      <div aria-busy="true" className={gridClass}>
        <span role="status" className="sr-only">Carregando favoritos…</span>
        {Array.from({ length: 4 }, (_, index) => (
          <NftCardSkeleton key={index} />
        ))}
      </div>
    )
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p className="text-text-secondary">Não foi possível carregar seus favoritos.</p>
        <button type="button" onClick={() => void refetch()} className="font-bold text-text-accent underline">
          Tentar de novo
        </button>
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <h2 className="text-xl font-bold">Você ainda não favoritou nenhum NFT</h2>
        <p className="max-w-md text-text-secondary">Toque no coração de um NFT para guardá-lo aqui.</p>
        <Link to="/" hash="mercado" className="mt-2 rounded-[5px] bg-primary px-6 py-3 font-bold text-ink hover:bg-text-accent">
          Explorar o mercado
        </Link>
      </div>
    )
  }
  return (
    <>
      <p aria-live="polite" className="mb-6 text-sm text-text-secondary">
        {items.length} {items.length === 1 ? 'NFT favoritado' : 'NFTs favoritados'}
      </p>
      <ul className={gridClass}>
        {items.map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} favoriteOnDesktop />
          </li>
        ))}
      </ul>
    </>
  )
}
