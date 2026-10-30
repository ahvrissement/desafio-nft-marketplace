import { useEffect, useRef, useState } from 'react'

import filterIcon from '@/assets/icons/filter.svg'
import searchIcon from '@/assets/icons/search-mobile.svg'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'

import { useCatalogSearch } from '../use-catalog-search'
import { CatalogFilters } from './catalog-filters'
import { CatalogSort } from './catalog-toolbar'

// Busca + botão de filtros do topo da Home no mobile.
export function MobileSearchBar() {
  return (
    <div className="flex gap-2">
      <SearchInput />
      <FiltersSheet />
    </div>
  )
}

function SearchInput() {
  const { search, setFilters } = useCatalogSearch()
  const [value, setValue] = useState(search.q ?? '')
  const lastSentRef = useRef(search.q ?? '')

  // A URL mudou POR FORA (voltar do navegador, "Limpar filtros")? Atualiza o campo.
  // Se foi a nossa própria digitação que mudou a URL, não mexe: o usuário pode
  // ter continuado digitando e perderia letras.
  useEffect(() => {
    const fromUrl = search.q ?? ''
    if (fromUrl !== lastSentRef.current) {
      lastSentRef.current = fromUrl
      setValue(fromUrl)
    }
  }, [search.q])

  // Espera 300ms sem digitar para atualizar a URL. replace: true para o botão
  // voltar não "desdigitar" letra por letra.
  const sendSearch = useDebouncedCallback((text: string) => {
    lastSentRef.current = text.trim()
    setFilters({ q: text.trim() || undefined }, { replace: true })
  }, 300)

  return (
    <label className="flex h-11.25 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-card px-3 has-focus-visible:outline-2 has-focus-visible:outline-ring">
      <img src={searchIcon} alt="" />
      <span className="sr-only">Buscar NFTs</span>
      <input
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          sendSearch(event.target.value)
        }}
        placeholder="Explorar coleções"
        className="h-full min-w-0 flex-1 bg-transparent text-sm leading-4 font-bold outline-none placeholder:text-text-subtle"
      />
    </label>
  )
}

// Painel lateral com filtros e ordenação. O Sheet do shadcn é um Radix Dialog:
// prende o foco dentro dele, fecha com Esc e devolve o foco ao botão que o abriu.
function FiltersSheet() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Filtros e ordenação"
        className="grid size-11.25 shrink-0 place-items-center rounded-[14px] bg-linear-[137deg] from-primary/45 from-25% to-primary"
      >
        <img src={filterIcon} alt="" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] gap-0 overflow-y-auto bg-card p-6">
        <SheetHeader className="mb-6 p-0">
          <SheetTitle className="text-lg font-bold">Filtros</SheetTitle>
          <SheetDescription>Os resultados atualizam enquanto você escolhe.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-10">
          <CatalogSort className="flex-col items-start" />
          <CatalogFilters />
          <SheetClose className="h-11 rounded-md bg-primary font-bold text-ink">Ver resultados</SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
