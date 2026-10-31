import { Link, Outlet } from '@tanstack/react-router'

import { ComingSoon } from '@/components/coming-soon'
import { useLogout } from '@/features/auth/use-logout'
import { cn } from '@/lib/utils'

const linkClass = 'flex h-11.25 items-center border-l-[6px] border-transparent pl-4 text-[15px] text-text-accent hover:bg-surface-raised'

// "Meu perfil" do Figma: barra lateral + a seção escolhida (Outlet).
// No mobile (sem frame no Figma), a barra vira abas horizontais no topo.
// Atividade, ofertas, downloads e suporte estão fora do escopo (README).
export function ProfileLayout() {
  const logout = useLogout()
  return (
    <div className="page-container grid gap-8 pt-6 pb-12 lg:grid-cols-[310px_1fr] lg:items-start lg:gap-7 lg:pt-8">
      {/* No celular vira uma faixa de abas; abaixo de 390px o espaçamento encolhe
          para "Sair" não ficar escondido fora da tela. */}
      <nav aria-label="Meu perfil" className="bg-card py-3 max-lg:-mx-6 max-lg:overflow-x-auto max-lg:py-0">
        <h2 className="hidden px-2.5 pt-2 pb-3 text-lg font-bold lg:block">Meu perfil</h2>
        <ul className="flex lg:flex-col">
          <li>
            <Link
              to="/profile"
              activeOptions={{ exact: true }}
              className={cn(linkClass, 'whitespace-nowrap data-[status=active]:border-primary max-lg:border-b-2 max-lg:border-l-0 max-lg:px-2.5 min-[390px]:max-lg:px-5')}
            >
              Dados do perfil
            </Link>
          </li>
          <li>
            <Link
              to="/profile/wallets"
              className={cn(linkClass, 'whitespace-nowrap data-[status=active]:border-primary max-lg:border-b-2 max-lg:border-l-0 max-lg:px-2.5 min-[390px]:max-lg:px-5')}
            >
              Carteiras
            </Link>
          </li>
          <li className="max-lg:hidden">
            <Link to="/favorites" className={cn(linkClass, 'whitespace-nowrap')}>
              Lista de interesse
            </Link>
          </li>
          {['Atividade', 'Ofertas', 'Arquivos baixados', 'Suporte'].map((label) => (
            <li key={label} className="hidden lg:block">
              <ComingSoon className={cn(linkClass, 'text-text-subtle')}>{label}</ComingSoon>
            </li>
          ))}
          <li className="lg:mt-1 lg:border-t lg:border-border">
            <button
              type="button"
              onClick={() => logout.mutate()}
              className={cn(linkClass, 'w-full font-bold whitespace-nowrap max-lg:px-2.5 min-[390px]:max-lg:px-5')}
            >
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
