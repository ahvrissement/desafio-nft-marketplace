import { getRouteApi } from '@tanstack/react-router'

import type { CatalogSearch } from './search'

// getRouteApi('/') dá acesso tipado à rota "/" SEM importar o arquivo da rota.
// Importar routes/index.tsx daqui criaria um ciclo: a rota importa estes
// componentes, e eles importariam a rota de volta.
const homeRoute = getRouteApi('/')

type FilterPatch = Partial<Omit<CatalogSearch, 'page'>>

export function useCatalogSearch() {
  const search = homeRoute.useSearch()
  const navigate = homeRoute.useNavigate()

  // Toda mudança de filtro volta para a página 1 (regra do README):
  // na página 4 de "Música", filtrar por "Solana" pode ter só 1 página.
  function setFilters(patch: FilterPatch, options: { replace?: boolean } = {}) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: undefined }),
      replace: options.replace,
      resetScroll: false, // filtrar não deve jogar a página para o topo
    })
  }

  function clearFilters() {
    void navigate({ search: {}, resetScroll: false })
  }

  return { search, setFilters, clearFilters }
}
