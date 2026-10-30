import { Link, useLocation } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import cartIcon from '@/assets/icons/cart.svg'
import loginIcon from '@/assets/icons/login.svg'
import { ComingSoon } from '@/components/coming-soon'
import { Button } from '@/components/ui/button'
import { HeaderSearch } from '@/features/catalog/components/header-search'
import { cn } from '@/lib/utils'

// Telas do fluxo de compra: no Figma, nelas o item ativo é "Mercado" e o header
// não tem a linha divisória. Nas demais (Início, Perfil, Carteiras, Login) o ativo
// é "Início" e a linha aparece.
const MARKET_PATHS = ['/nft', '/cart', '/checkout']

type Section = 'home' | 'market'

function useActiveSection(): Section {
  const pathname = useLocation({ select: (location) => location.pathname })
  const hash = useLocation({ select: (location) => location.hash })
  const inMarket = hash === 'mercado' || MARKET_PATHS.some((path) => pathname.startsWith(path))
  return inMarket ? 'market' : 'home'
}

export function Header() {
  const section = useActiveSection()
  // Passa a vir do carrinho no passo do carrinho. O ": number" é necessário porque,
  // com a constante 0, o TS sabe que "cartCount === 1" nunca seria verdade e acusa erro.
  const cartCount: number = 0

  return (
    // Só no desktop: no mobile a navegação é a MobileTabBar.
    <header className="hidden pt-6 lg:block">
      <div className="page-container">
        <div
          className={cn(
            'flex h-11.25 items-start justify-between',
            section === 'home' && 'border-b-[0.3px] border-primary',
          )}
        >
          <Link to="/" className="w-40 pt-2 text-sm font-bold tracking-widest">
            KURIO
          </Link>

          <nav aria-label="Principal">
            <ul className="flex gap-10">
              <li>
                <NavItem active={section === 'home'}>
                  {(className) => (
                    <Link
                      to="/"
                      // Só "ativo" no "/" sem #hash; a busca (?q=) não importa.
                      activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
                      aria-current={section === 'home' ? 'page' : undefined}
                      className={className}
                    >
                      Início
                    </Link>
                  )}
                </NavItem>
              </li>
              <li>
                <NavItem active={section === 'market'}>
                  {(className) => (
                    <Link
                      to="/"
                      hash="mercado" // rola até o catálogo da Home
                      activeOptions={{ exact: true, includeHash: true, includeSearch: false }}
                      aria-current={section === 'market' ? 'page' : undefined}
                      className={className}
                    >
                      Mercado
                    </Link>
                  )}
                </NavItem>
              </li>
              <li>
                <NavItem active={false}>{(className) => <ComingSoon className={className}>Criadores</ComingSoon>}</NavItem>
              </li>
              <li>
                <NavItem active={false}>{(className) => <ComingSoon className={className}>Aprenda</ComingSoon>}</NavItem>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-7">
            <HeaderSearch />

            <button
              type="button"
              aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
              className="relative grid h-6 w-8.5 place-items-start"
            >
              <img src={cartIcon} alt="" />
              {cartCount > 0 && (
                <span
                  aria-hidden // o número já está no aria-label do botão
                  className="absolute top-0 left-3.75 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium text-ink ring-2 ring-background"
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Abre o login no passo de autenticação */}
            <Button type="button" className="h-8.75 w-25 gap-1 rounded-md px-0 text-base font-medium text-ink">
              <span className="grid size-5 place-items-center">
                <img src={loginIcon} alt="" />
              </span>
              Entrar
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

// Item do menu: texto em cima, sublinhado laranja de 3px embaixo quando ativo.
// Recebe uma função (render prop) para aplicar o mesmo estilo a um <Link> ou a um <ComingSoon>.
function NavItem({ active, children }: { active: boolean; children: (className: string) => ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      {/* leading-4: o text-base do Tailwind vem com 24px de altura de linha; o Figma usa 16px.
          Com 24px, o sublinhado desceria para baixo da linha divisória. */}
      {children(cn('text-base leading-4', active ? 'font-bold text-text-accent' : 'text-foreground'))}
      <span aria-hidden className={cn('h-0.75 rounded-full', active ? 'bg-primary' : 'bg-transparent')} />
    </div>
  )
}
