import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { NFT_PAGE_SIZE } from '@/contracts/nft'
import { cn } from '@/lib/utils'

import { catalogQueries } from '../queries'
import { hasActiveFilters, toListQuery } from '../search'
import { useCatalogSearch } from '../use-catalog-search'
import { CatalogPagination } from './catalog-pagination'
import { NftCard, NftCardSkeleton } from './nft-card'

// Mobile: 2 colunas "em escadinha" (a coluna da direita desce 32px, como no Figma).
// Tablet: 3 colunas sem escadinha. Desktop: 3 colunas com os espaçamentos do Figma.
const gridClass = cn(
  'grid grid-cols-2 gap-x-4 gap-y-6 pb-8 max-md:[&>*:nth-child(even)]:translate-y-8',
  'md:grid-cols-3 md:pb-0 lg:gap-x-8.5 lg:gap-y-18',
)

const PRIORITY_CARDS = 3 // primeira linha do desktop

export function NftGrid() {
  const { search, clearFilters, setFilters } = useCatalogSearch()
  const list = useQuery(catalogQueries.list(toListQuery(search)))

  // 1. Carregando pela primeira vez (ainda não há nada para mostrar)
  if (list.isPending) {
    return (
      <div aria-busy="true">
        <p className="sr-only" role="status">
          Carregando NFTs…
        </p>
        <div className={gridClass}>
          {Array.from({ length: NFT_PAGE_SIZE }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  // 2. Erro sem dados anteriores. Se já havia cards na tela, eles continuam
  //    (placeholderData) e o erro aparece como aviso acima deles, mais abaixo.
  if (list.isError && !list.data) {
    return (
      <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6">
        <p className="text-lg font-bold">Não foi possível carregar os NFTs.</p>
        <p className="text-text-secondary">{list.error.message}</p>
        <Button onClick={() => list.refetch()} className="text-ink">
          Tentar novamente
        </Button>
      </div>
    )
  }

  const { items, page, total, totalPages } = list.data

  // 3. Vazio: nenhum resultado, ou uma página que não existe (?page=99)
  if (items.length === 0) {
    const pageOutOfRange = total > 0
    return (
      <div role="status" className="flex flex-col items-start gap-4 rounded-lg border border-dashed border-border p-6">
        <p className="text-lg font-bold">{pageOutOfRange ? 'Esta página não existe.' : 'Nenhum NFT encontrado.'}</p>
        <p className="text-text-secondary">
          {pageOutOfRange
            ? `O catálogo tem ${totalPages} ${totalPages === 1 ? 'página' : 'páginas'} com esses filtros.`
            : 'Tente outra busca ou remova alguns filtros.'}
        </p>
        {pageOutOfRange ? (
          <Button onClick={() => setFilters({})} className="text-ink">
            Ir para a primeira página
          </Button>
        ) : (
          hasActiveFilters(search) && (
            <Button onClick={clearFilters} className="text-ink">
              Limpar filtros
            </Button>
          )
        )}
      </div>
    )
  }

  // 4. Sucesso
  return (
    <div className="flex flex-col gap-8 lg:gap-22">
      {/* aria-live: o leitor de tela anuncia o total sempre que ele muda */}
      <p className="sr-only" aria-live="polite">
        {total} {total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}, página {page} de {totalPages}
      </p>

      {list.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível atualizar a lista; mostrando os resultados anteriores.
        </p>
      )}

      <div
        // isPlaceholderData: os cards na tela são da busca ANTERIOR, e a nova está a caminho.
        aria-busy={list.isPlaceholderData}
        className={cn(gridClass, 'transition-opacity', list.isPlaceholderData && 'opacity-60')}
      >
        {items.map((nft, index) => (
          <NftCard key={nft.id} nft={nft} priority={page === 1 && index < PRIORITY_CARDS} />
        ))}
      </div>

      <CatalogPagination page={page} totalPages={totalPages} />
    </div>
  )
}
