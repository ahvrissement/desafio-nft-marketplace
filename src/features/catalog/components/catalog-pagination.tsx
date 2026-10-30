import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import arrowIcon from '@/assets/icons/arrow-right.svg'
import { cn } from '@/lib/utils'

import { pageWindow } from '../pagination'

// Paginação com <Link> de verdade (e não botões): cada página tem URL própria,
// então dá para abrir em outra aba, compartilhar e o navegador pré-carrega
// (defaultPreload: 'intent') ao passar o mouse.
export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação" className="flex justify-center lg:justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 && (
          <li>
            <PageLink page={page - 1} label="Página anterior">
              <img src={arrowIcon} alt="" className="rotate-90" />
            </PageLink>
          </li>
        )}
        {pageWindow(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-text-secondary">
              …
            </li>
          ) : (
            <li key={item}>
              <PageLink page={item} label={`Página ${item}`} current={item === page}>
                {item}
              </PageLink>
            </li>
          ),
        )}
        {page < totalPages && (
          <li>
            <PageLink page={page + 1} label="Próxima página">
              {/* O ícone do Figma é uma seta para baixo girada (-90°) */}
              <img src={arrowIcon} alt="" className="-rotate-90" />
            </PageLink>
          </li>
        )}
      </ul>
    </nav>
  )
}

interface PageLinkProps {
  page: number
  label: string
  current?: boolean
  children: ReactNode
}

function PageLink({ page, label, current = false, children }: PageLinkProps) {
  return (
    <Link
      from="/"
      to="/"
      search={(prev) => ({ ...prev, page })}
      hash="mercado" // volta a rolagem para o topo do catálogo, não da página
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'grid size-8.75 place-items-center rounded-sm text-lg leading-4',
        current ? 'bg-primary font-bold text-ink' : 'border border-border hover:border-primary',
      )}
    >
      {children}
    </Link>
  )
}
