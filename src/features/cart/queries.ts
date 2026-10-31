import { queryOptions, type QueryClient } from '@tanstack/react-query'

import type { Cart } from '@/contracts/cart'

import { fetchCart } from './api'

// Carrinho da conta: dado privado (['me', userId, ...], limpo no logout).
// Carrinho do visitante: ['cart', 'guest'].
export const cartQueries = {
  cart: (userId: string | null) =>
    queryOptions({
      queryKey: userId ? (['me', userId, 'cart'] as const) : (['cart', 'guest'] as const),
      queryFn: ({ signal }) => fetchCart(signal),
    }),
}

// Grava a resposta de uma mutation no cache, a não ser que ela seja MAIS ANTIGA
// do que o que já está lá. Cenário: "+" rápido duas vezes; a resposta do 1º
// clique (versão 4) chega depois da do 2º (versão 5). Sem esta guarda, o
// carrinho "voltaria" para a quantidade anterior.
export function setCartData(queryClient: QueryClient, userId: string | null, next: Cart) {
  const key = cartQueries.cart(userId).queryKey
  const current = queryClient.getQueryData<Cart>(key)
  if (current && current.id === next.id && next.version < current.version) return
  queryClient.setQueryData(key, next)
}
