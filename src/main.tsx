import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'

import { authQueries, endSession } from '@/features/auth/queries'
import { TOKEN_STORAGE_KEY, getToken } from '@/features/auth/token-store'
import { MOCKS_ENABLED } from '@/lib/env'
import { setSessionExpiredHandler } from '@/lib/http'
import { setMocksReady } from '@/lib/mocks-ready'
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

// Sessão expirou no meio do uso (qualquer chamada respondeu SESSION_EXPIRED):
// limpa os dados privados e oferece entrar de novo NA MESMA página. Depois do
// login, a pessoa continua de onde parou (README: "preservando o contexto").
setSessionExpiredHandler(() => {
  // Várias chamadas podem falhar juntas; só a primeira encontra o token.
  if (!getToken()) return
  endSession(queryClient)
  toast.error('Sua sessão expirou. Entre novamente para continuar.', {
    id: 'sessao-expirada',
    action: {
      label: 'Entrar',
      onClick: () => void router.navigate({ to: '.', search: (prev) => ({ ...prev, auth: 'entrar' }), resetScroll: false }),
    },
  })
})

// Login/logout em OUTRA aba: o evento "storage" só dispara nas outras abas.
// Esta aba descarta os dados privados e pergunta de novo quem está logado.
window.addEventListener('storage', (event) => {
  if (event.key !== TOKEN_STORAGE_KEY) return
  queryClient.removeQueries({ queryKey: ['me'] })
  void queryClient.invalidateQueries({ queryKey: authQueries.session().queryKey })
})

// O MSW roda também em PRODUÇÃO: o desafio pede um deploy público sem backend.
// O import() dinâmico deixa o código do mock num arquivo JS separado.
async function enableMocking() {
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      quiet: import.meta.env.PROD,
      // Imagens, fontes e o próprio Vite passam direto; só avisamos se
      // alguma chamada à /api ficou sem handler (provável esquecimento).
      onUnhandledRequest(request, print) {
        if (new URL(request.url).pathname.startsWith('/api/')) print.warning()
      },
    })
  } finally {
    // Se o service worker falhar (navegador sem suporte), as requisições
    // seguem e caem nos estados de erro, em vez de ficarem presas para sempre.
    setMocksReady()
  }
}

// startTransition: a primeira montagem é feita em fatias de ~5ms, devolvendo
// o controle ao navegador entre elas (sem uma "tarefa longa" travando a página).
const root = createRoot(document.getElementById('root')!)
startTransition(() => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})

// A tela NÃO espera o mock: o cabeçalho, o Hero, os skeletons e a barra
// inferior aparecem logo. O mock só começa DEPOIS da primeira pintura com
// conteúdo (o navegador avisa pelo PerformanceObserver), então baixar e
// executar o MSW não atrasa o que a pessoa vê primeiro. As requisições
// esperam por ele (lib/mocks-ready.ts).
// Prazo de reserva: se o aviso não vier (navegador sem suporte), começa em 1,5s.
function afterFirstContentfulPaint(callback: () => void) {
  let done = false
  let observer: PerformanceObserver | undefined
  const run = () => {
    if (done) return
    done = true
    observer?.disconnect()
    callback()
  }
  try {
    observer = new PerformanceObserver((list) => {
      if (list.getEntriesByName('first-contentful-paint').length > 0) run()
    })
    observer.observe({ type: 'paint', buffered: true })
  } catch {
    // Sem PerformanceObserver: fica só o prazo de reserva
  }
  setTimeout(run, 1_500)
}

if (MOCKS_ENABLED) afterFirstContentfulPaint(() => void enableMocking())
