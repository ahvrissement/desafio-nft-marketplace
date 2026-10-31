import { useQuery } from '@tanstack/react-query'

import { authQueries } from './queries'

// O usuário logado (ou null). `isPending` = ainda conferindo o token salvo:
// a interface não deve mostrar "Entrar" e piscar para "Ana" logo depois.
export function useSession() {
  const { data: user = null, isPending } = useQuery(authQueries.session())
  return { user, isPending }
}
