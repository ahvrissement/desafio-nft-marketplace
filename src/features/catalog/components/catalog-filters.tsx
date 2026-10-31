import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'

import { Slider } from '@/components/ui/slider'
import { fromCents, toCents } from '@/lib/money'
import { cn } from '@/lib/utils'

import { catalogQueries } from '../queries'
import { useCatalogSearch } from '../use-catalog-search'

// Painel de filtros do Figma (sidebar no desktop, Sheet no mobile).
// Os filtros NÃO têm estado próprio: leem e escrevem direto na URL.
export function CatalogFilters() {
  const { search, setFilters } = useCatalogSearch()
  const facets = useQuery(catalogQueries.facets())

  // Liga/desliga um valor numa lista: ['musica'] + 'arte-3d' → ['musica', 'arte-3d']
  function toggle<T extends string>(list: T[] | undefined, value: T): T[] | undefined {
    const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
    return next.length > 0 ? next : undefined // lista vazia some da URL
  }

  return (
    <div className="flex flex-col gap-10">
      <FacetGroup
        legend="Coleções"
        options={facets.data?.categories}
        selected={search.category}
        onToggle={(value) => setFilters({ category: toggle(search.category, value) })}
        boldCount
      />

      {facets.data ? (
        <PriceFilter
          // A key "reseta" o componente quando a URL ou a faixa mudam por fora
          // (ex.: "Limpar filtros"): o slider volta a refletir a URL.
          key={`${search.minPrice}-${search.maxPrice}-${facets.data.priceRange.min}-${facets.data.priceRange.max}`}
          bounds={facets.data.priceRange}
          value={{ min: search.minPrice, max: search.maxPrice }}
          onApply={(range) => setFilters({ minPrice: range.min, maxPrice: range.max })}
        />
      ) : (
        <FilterSkeleton title="Faixa de preço" rows={2} />
      )}

      <FacetGroup
        legend="Rede"
        options={facets.data?.networks}
        selected={search.network}
        onToggle={(value) => setFilters({ network: toggle(search.network, value) })}
      />

      {facets.isError && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar os filtros.{' '}
          <button type="button" onClick={() => facets.refetch()} className="underline">
            Tentar novamente
          </button>
        </p>
      )}
    </div>
  )
}

interface FacetGroupProps<T extends string> {
  legend: string
  options: { value: T; label: string; count: number }[] | undefined
  selected: T[] | undefined
  onToggle: (value: T) => void
  boldCount?: boolean
}

// No Figma é uma lista de texto; a descrição do componente diz "checkboxes".
// Usamos <input type="checkbox"> de verdade (escondido visualmente): teclado
// (Espaço), leitor de tela ("marcado/desmarcado") e formulário vêm de graça.
function FacetGroup<T extends string>({ legend, options, selected, onToggle, boldCount }: FacetGroupProps<T>) {
  if (!options) return <FilterSkeleton title={legend} rows={3} />

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold">{legend}</legend>
      <ul className="px-3">
        {options.map((option) => {
          const checked = selected?.includes(option.value) ?? false
          return (
            <li key={option.value}>
              <label
                className={cn(
                  'flex cursor-pointer justify-between text-[15px] leading-10 text-text-secondary hover:text-foreground',
                  // has-[]: estiliza o label conforme o estado do input DENTRO dele
                  'has-checked:text-text-accent has-focus-visible:outline-2 has-focus-visible:outline-ring',
                )}
              >
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => onToggle(option.value)} />
                {/* Sublinhado no item marcado: o estado não depende só da cor (README) */}
                <span className={cn(checked && 'underline underline-offset-4')}>{option.label}</span>
                <span className={cn(boldCount && 'font-bold')}>
                  ({option.count})<span className="sr-only"> NFTs</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

interface PriceFilterProps {
  bounds: { min: string; max: string }
  value: { min?: string; max?: string }
  onApply: (range: { min?: string; max?: string }) => void
}

// "0.02" → "0,02": o Figma usa vírgula aqui (e ponto nos cards).
const formatPrice = (cents: number) => fromCents(cents).replace('.', ',')

function PriceFilter({ bounds, value, onApply }: PriceFilterProps) {
  const titleId = useId()
  const lower = toCents(bounds.min)
  const upper = toCents(bounds.max)

  // Estado LOCAL de propósito: arrastar o slider não pode disparar uma busca a cada
  // pixel. A URL só muda ao clicar em "Aplicar".
  const [range, setRange] = useState<[number, number]>([
    value.min ? toCents(value.min) : lower,
    value.max ? toCents(value.max) : upper,
  ])

  function apply() {
    const [min, max] = range
    // Nos extremos é o mesmo que "sem filtro": deixa a URL limpa.
    onApply({ min: min > lower ? fromCents(min) : undefined, max: max < upper ? fromCents(max) : undefined })
  }

  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-col gap-3">
      <h3 id={titleId} className="text-lg leading-4 font-bold">
        Faixa de preço
      </h3>
      <div className="flex flex-col gap-3 pl-3">
        <Slider
          min={lower}
          max={upper}
          step={1}
          minStepsBetweenThumbs={1}
          value={range}
          onValueChange={(next) => setRange([next[0], next[1]])}
          // Cada bolinha precisa de um nome próprio para o leitor de tela
          thumbLabels={['Preço mínimo', 'Preço máximo']}
          className="py-2"
        />
        <p aria-live="polite" className="text-[15px]">
          Preço: {formatPrice(range[0])} - {formatPrice(range[1])} ETH
        </p>
        <button
          type="button"
          onClick={apply}
          className="self-start rounded-md bg-primary px-3 py-2 text-base leading-5 font-bold text-ink hover:bg-primary/85"
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}

function FilterSkeleton({ title, rows }: { title: string; rows: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <p className="text-lg leading-4 font-bold">{title}</p>
      <div className="flex flex-col gap-4 px-3 py-3">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="h-4 rounded-sm skeleton-shimmer" />
        ))}
      </div>
    </div>
  )
}
