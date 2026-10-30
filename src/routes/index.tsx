import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { MobileSearchBar } from '@/features/catalog/components/mobile-search-bar'
import { catalogQueries } from '@/features/catalog/queries'
import { CATALOG_DEFAULTS, catalogSearchSchema, toListQuery } from '@/features/catalog/search'

// Arquivo src/routes/index.tsx  →  rota "/".
export const Route = createFileRoute('/')({
  // Valida e tipa os parâmetros da URL (?q=&category=&page=...).
  validateSearch: catalogSearchSchema,
  // Tira da URL os valores padrão: "/" em vez de "/?tab=all&sort=recent&page=1".
  search: { middlewares: [stripSearchParams(CATALOG_DEFAULTS)] },

  // O loader roda ANTES da tela (e até antes do clique, no preload por hover).
  // loaderDeps diz de quais parâmetros ele depende: mudou um, ele roda de novo.
  loaderDeps: ({ search }) => toListQuery(search),
  loader: ({ context: { queryClient }, deps }) => {
    // prefetch SEM await: começa a buscar já, mas não segura a tela esperando.
    // A tela abre na hora com os skeletons, e o useQuery pega o mesmo cache.
    // (Com await, a primeira visita ficaria em branco até a API responder.)
    void queryClient.prefetchQuery(catalogQueries.list(deps))
    void queryClient.prefetchQuery(catalogQueries.facets())
  },

  staticData: { mobileTab: 'home' },
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex flex-col gap-6 pt-10 lg:gap-24 lg:pt-8">
      {/* O título visível vem com o Hero (passo 3c) */}
      <h1 className="sr-only">Kurio: marketplace de NFTs</h1>
      <div className="page-container lg:hidden">
        <MobileSearchBar />
      </div>
      <CatalogSection />
    </div>
  )
}
