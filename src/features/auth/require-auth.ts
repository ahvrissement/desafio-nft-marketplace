import { redirect, type ParsedLocation } from '@tanstack/react-router'

import type { RouterContext } from '@/routes/__root'

import { authQueries } from './queries'

// Guarda das rotas privadas (checkout, perfil, carteiras), usada no beforeLoad.
// Sem sessão: volta para `fallback` com o modal de login aberto e, depois de
// entrar, segue para a rota pedida (?redirect=). README: "proteção dos fluxos
// privados" e "retorno ao fluxo anterior".
export async function requireAuth({
  context,
  location,
  fallback,
}: {
  context: RouterContext
  location: ParsedLocation
  fallback: '/' | '/cart'
}) {
  // ensureQueryData: usa o cache se já souber quem está logado; senão pergunta à API.
  const user = await context.queryClient.ensureQueryData(authQueries.session()).catch(() => null)
  if (!user) {
    // O destino NÃO pode carregar o próprio ?auth= (nem um redirect antigo):
    // senão, depois de entrar, a pessoa voltaria para a rota com o modal aberto de novo.
    const target = new URL(location.href, window.location.origin)
    target.searchParams.delete('auth')
    target.searchParams.delete('redirect')
    throw redirect({ to: fallback, search: { auth: 'entrar', redirect: target.pathname + target.search }, replace: true })
  }
  return { user }
}
