import type { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

// "Contexto" do router: objetos que toda rota recebe nos seus loaders.
// Passamos o queryClient para que uma rota possa pré-carregar dados
// (queryClient.ensureQueryData) ANTES de renderizar a tela.
export interface RouterContext {
  queryClient: QueryClient
}

// __root é o layout que envolve todas as páginas. <Outlet /> é onde a página
// da rota atual é renderizada. Header e Footer vão entrar aqui depois.
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      {/* Os painéis de devtools só aparecem em desenvolvimento */}
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  )
}
