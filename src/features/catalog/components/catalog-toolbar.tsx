import { useId } from 'react'

import arrowDownIcon from '@/assets/icons/arrow-down.svg'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NFT_SORT_LABELS, NFT_SORTS, nftSortSchema, type NftTab } from '@/contracts/nft'
import { cn } from '@/lib/utils'

import { useCatalogSearch } from '../use-catalog-search'

const TABS: { value: NftTab; label: string }[] = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

// "Todos os NFTs / Novos lançamentos / Em alta".
// São <button aria-pressed> (botões de alternância), não abas ARIA (role="tab"):
// role="tab" promete setas do teclado e um painel associado, o que não é o caso.
// Cada um só troca um filtro, e aria-pressed diz qual está ligado.
export function CatalogTabs({ className }: { className?: string }) {
  const { search, setFilters } = useCatalogSearch()

  return (
    // Celulares estreitos (< ~360px): as três não cabem. Em vez de cortar o
    // "Em alta" na borda, a linha rola de lado (sem barra visível).
    <div
      role="group"
      aria-label="Recorte do catálogo"
      className={cn('flex gap-4 overflow-x-auto [scrollbar-width:none] lg:gap-5 lg:overflow-visible', className)}
    >
      {TABS.map((tab) => {
        const active = search.tab === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={active}
            onClick={() => setFilters({ tab: tab.value })}
            className={cn(
              // 14px no mobile: em 390px as três abas com 15px encostam na borda
              'relative pb-2 text-sm leading-4 font-medium whitespace-nowrap lg:text-[15px]',
              active ? 'text-text-accent' : 'text-foreground hover:text-text-accent',
            )}
          >
            {tab.label}
            {/* Sublinhado de 2px do Figma (também é o indicador que não depende da cor) */}
            {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
          </button>
        )
      })}
    </div>
  )
}

export function CatalogSort({ className }: { className?: string }) {
  const labelId = useId()
  const { search, setFilters } = useCatalogSearch()

  return (
    <div className={cn('flex items-center gap-2 text-[15px]', className)}>
      <span id={labelId}>Ordenar por:</span>
      <Select
        value={search.sort}
        // O valor chega como string; o schema garante que é uma ordenação válida.
        onValueChange={(value) => setFilters({ sort: nftSortSchema.parse(value) })}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          // Sem borda nem fundo (como no Figma) e com a seta do Figma no lugar do ícone padrão.
          className="h-auto gap-2 border-0 bg-transparent p-0 text-[15px] dark:bg-transparent dark:hover:bg-transparent [&>svg]:hidden"
        >
          <SelectValue />
          <img src={arrowDownIcon} alt="" className="ml-1" />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {NFT_SORTS.map((sort) => (
            <SelectItem key={sort} value={sort} className="text-[15px]">
              {NFT_SORT_LABELS[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
