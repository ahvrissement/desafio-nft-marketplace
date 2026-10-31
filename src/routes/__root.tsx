import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Outlet, createRootRouteWithContext, useMatches } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { MobileTabBar, type MobileTab } from '@/components/layout/mobile-tab-bar'
import { NotFoundPage } from '@/components/not-found-page'
import { Toaster } from '@/components/ui/sonner'
import { AuthDialog } from '@/features/auth/components/auth-dialog'
import { authSearchSchema } from '@/features/auth/search'
import { RealtimeBridge } from '@/features/realtime/realtime-bridge'
import { MOCKS_ENABLED } from '@/lib/env'
import { cn } from '@/lib/utils'

// Painel de cenários: só com o MSW ligado, e carregado sob demanda
// (fica fora do bundle principal).
const ScenariosPanel = MOCKS_ENABLED ? lazy(() => import('@/features/scenarios/scenarios-panel')) : null

// "Contexto" do router: objetos que toda rota recebe nos seus loaders.
// Passamos o queryClient para que uma rota possa pré-carregar dados
// (queryClient.ensureQueryData) ANTES de renderizar a tela.
export interface RouterContext {
  queryClient: QueryClient
}

// staticData: informações FIXAS que cada rota declara sobre si mesma.
// Aqui: "esta tela mostra a barra inferior no mobile, com este item ativo".
// Como no Register do main.tsx, o declare module deixa isso tipado.
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    mobileTab?: MobileTab
    // A tela tem uma barra de compra fixa no rodapé do mobile (detalhe do NFT)
    mobileBuyBar?: boolean
  }
}

// __root é o layout que envolve todas as páginas. <Outlet /> é onde a página
// da rota atual é renderizada.
export const Route = createRootRouteWithContext<RouterContext>()({
  // ?auth=entrar | ?auth=cadastro em QUALQUER rota abre o modal de login por cima
  // da página atual (como no Figma). Fica na URL: o "voltar" do navegador fecha.
  validateSearch: authSearchSchema,
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  // A rota mais "funda" que declarar mobileTab vence (ex.: /profile/wallets).
  const mobileTab = useMatches({
    select: (matches) => matches.findLast((match) => match.staticData.mobileTab)?.staticData.mobileTab,
  })
  const mobileBuyBar = useMatches({ select: (matches) => matches.some((match) => match.staticData.mobileBuyBar) })

  return (
    // As barras do mobile são fixas e cobrem o fim da página: o padding reserva esse espaço.
    <div className={cn('flex min-h-svh flex-col', mobileTab && 'pb-31.5 lg:pb-0', mobileBuyBar && 'pb-44 lg:pb-0')}>
      {/* Link "pular para o conteúdo": o primeiro Tab da página. Invisível até
          receber foco; poupa quem navega por teclado de passar por todo o menu. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>

      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />

      {mobileTab && <MobileTabBar active={mobileTab} />}

      <AuthDialog />
      {/* Socket.IO: aplica nft.updated / order.updated no cache (não desenha nada) */}
      <RealtimeBridge />
      {ScenariosPanel && (
        <Suspense>
          <ScenariosPanel />
        </Suspense>
      )}
      {/* Avisos (toasts) com aria-live: o leitor de tela anuncia sem roubar o foco */}
      <Toaster position="top-center" />

      {/* Os painéis de devtools só aparecem em desenvolvimento */}
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </div>
  )
}
