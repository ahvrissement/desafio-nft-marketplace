import { queryOptions, type QueryClient } from '@tanstack/react-query'

import type { User } from '@/contracts/auth'

import { fetchFavoriteNfts, fetchFavorites, fetchSession } from './api'
import { clearToken } from './token-store'

// Chaves de dados PRIVADOS começam com ['me', userId]. Duas proteções:
//   1. O id do usuário faz parte da chave: o cache da Ana e o do Pedro nunca
//      se misturam, mesmo que algo escape da limpeza.
//   2. No logout/troca, removeQueries(['me']) apaga tudo de uma vez.
export const authQueries = {
  session: () =>
    queryOptions({
      queryKey: ['session'] as const,
      queryFn: ({ signal }) => fetchSession(signal),
      staleTime: 5 * 60_000,
      // 401 não é falha passageira: tentar de novo não ressuscita a sessão.
      retry: false,
    }),

  favorites: (userId: string) =>
    queryOptions({
      queryKey: ['me', userId, 'favorites'] as const,
      queryFn: ({ signal }) => fetchFavorites(signal),
    }),

  // DEBAIXO da chave dos favoritos de propósito: o invalidate de
  // ['me', userId, 'favorites'] (feito ao favoritar/desfavoritar) também
  // atualiza esta lista, sem nenhum código a mais.
  favoriteNfts: (userId: string) =>
    queryOptions({
      queryKey: ['me', userId, 'favorites', 'nfts'] as const,
      queryFn: ({ signal }) => fetchFavoriteNfts(signal),
    }),
}

// Começo de sessão (login, cadastro): troca de usuário inclusive.
export function startSession(queryClient: QueryClient, user: User) {
  // Se havia outra pessoa logada nesta aba, nada dela sobrevive.
  queryClient.removeQueries({ queryKey: ['me'] })
  queryClient.setQueryData(authQueries.session().queryKey, user)
}

// Fim de sessão (logout, expiração). Um caminho só: nenhum deles esquece de
// limpar algo. Os listeners do Socket.IO também serão encerrados aqui.
export function endSession(queryClient: QueryClient) {
  clearToken()
  queryClient.removeQueries({ queryKey: ['me'] })
  // O próximo carrinho é de um visitante novo (vazio), não o de antes do login.
  queryClient.removeQueries({ queryKey: ['cart'] })
  queryClient.setQueryData(authQueries.session().queryKey, null)
}
