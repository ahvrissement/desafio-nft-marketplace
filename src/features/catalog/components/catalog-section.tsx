import { CatalogFilters } from './catalog-filters'
import { CatalogSort, CatalogTabs } from './catalog-toolbar'
import { NftGrid } from './nft-grid'

// Seção "Products" do Figma.
//   Desktop: sidebar de filtros (310px) + 48px + produtos (abas/ordenação, grid, paginação).
//   Mobile: só abas e grid; filtros e ordenação ficam no Sheet da barra de busca.
export function CatalogSection() {
  return (
    <section id="mercado" aria-labelledby="catalogo-titulo" className="page-container scroll-mt-6">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>
      <div className="lg:grid lg:grid-cols-[310px_1fr] lg:items-start lg:gap-12">
        <aside aria-label="Filtros" className="hidden bg-card p-5 lg:block">
          <CatalogFilters />
        </aside>

        <div className="flex flex-col gap-4 lg:gap-8">
          <div className="flex items-center justify-between gap-4">
            <CatalogTabs className="max-lg:w-full max-lg:justify-between max-lg:gap-2" />
            <CatalogSort className="hidden lg:flex" />
          </div>
          <NftGrid />
        </div>
      </div>
    </section>
  )
}
