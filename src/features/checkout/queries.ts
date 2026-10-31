import { queryOptions } from '@tanstack/react-query'

import { fetchOrder, fetchQuote, fetchWallets } from './api'

// Tudo privado: debaixo de ['me', userId] (limpo no logout/troca de usuário).
export const checkoutQueries = {
  quote: (userId: string) =>
    queryOptions({
      queryKey: ['me', userId, 'quote'] as const,
      queryFn: ({ signal }) => fetchQuote(signal),
      // A cotação vale AGORA: sempre "velha", busca de novo ao voltar à aba.
      staleTime: 0,
    }),
  wallets: (userId: string) =>
    queryOptions({ queryKey: ['me', userId, 'wallets'] as const, queryFn: ({ signal }) => fetchWallets(signal) }),
  order: (userId: string, orderId: string) =>
    queryOptions({
      queryKey: ['me', userId, 'orders', orderId] as const,
      queryFn: ({ signal }) => fetchOrder(orderId, signal),
      // Pendente: pergunta de novo a cada 1s até a rede decidir. (No passo do
      // Socket.IO, o order.updated avisa antes; isto continua como reconciliação.)
      // Confirmado ou recusado são TERMINAIS: para de perguntar.
      refetchInterval: (query) => (query.state.data?.status === 'pending' ? 1_000 : false),
    }),
}
