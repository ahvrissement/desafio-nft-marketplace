import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from '@/lib/query-client'
import './index.css'
// Arquivo GERADO pelo plugin do Vite a partir de src/routes/. Não edite à mão.
import { routeTree } from './routeTree.gen'

const router = createRouter({
  routeTree,
  context: { queryClient },
  // Ao passar o mouse num <Link>, já começa a carregar a próxima rota.
  defaultPreload: 'intent',
  // Deixa o React Query decidir se o dado está velho, não o router.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
})

// Isso "registra" o nosso router no TypeScript. É o que faz
// <Link to="/nft/$id"> dar erro de compilação se a rota não existir.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// O MSW roda também em PRODUÇÃO: o desafio pede um deploy público sem backend.
// Esperamos o service worker ficar ativo antes de renderizar; senão as primeiras
// requisições escapariam para a rede real e dariam 404.
// O import() dinâmico deixa o código do mock num arquivo JS separado.
async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  await worker.start({
    quiet: import.meta.env.PROD,
    // Imagens, fontes e o próprio Vite passam direto; só avisamos se
    // alguma chamada à /api ficou sem handler (provável esquecimento).
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith('/api/')) print.warning()
    },
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
