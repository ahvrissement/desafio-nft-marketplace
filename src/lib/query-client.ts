import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/http'

// Diz ao TypeScript que o `error` de todo useQuery/useMutation é um ApiError.
// Assim `query.error.code` tem autocomplete, sem precisar de cast.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}

// Um único QueryClient para o app inteiro: é ele que guarda o cache.
//
// staleTime: por quanto tempo um dado é considerado "fresco". Enquanto estiver fresco,
// trocar de tela e voltar NÃO dispara nova requisição. 30s é um bom meio-termo para
// catálogo; os preços em tempo real chegam pelo Socket.IO, não por refetch.
//
// retry: por padrão o Query tenta 3x qualquer erro. Só faz sentido repetir falhas
// transitórias (a regra está em ApiError.isRetryable).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => error instanceof ApiError && error.isRetryable && failureCount < 2,
    },
  },
})
