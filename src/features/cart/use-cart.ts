import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { AddCartItemInput, ApplyCouponInput, Cart, UpdateCartItemInput } from '@/contracts/cart'
import { useSession } from '@/features/auth/use-session'
import type { ApiError } from '@/lib/http'

import { addCartItem, applyCoupon, removeCartItem, removeCoupon, updateCartItem } from './api'
import { cartQueries, setCartData } from './queries'

// O carrinho atual (da conta ou do visitante).
// Só busca depois de saber QUEM está logado: buscar antes poderia trazer o
// carrinho de visitante para alguém que, um instante depois, aparece logado.
export function useCart() {
  const { user, isPending: sessionPending } = useSession()
  const query = useQuery({ ...cartQueries.cart(user?.id ?? null), enabled: !sessionPending })
  return { ...query, isPending: sessionPending || query.isPending }
}

const notifyError = (error: ApiError) => {
  // Sessão expirada já tem o próprio aviso, com o botão "Entrar".
  if (error.code !== 'SESSION_EXPIRED') toast.error(error.message)
}

const CART_MUTATION = ['cart', 'mutation'] as const

// A resposta mais nova (maior versão) das mutations em andamento, por carrinho.
// Fica fora do React de propósito: vários componentes (header, linhas, resumo)
// disparam mutations no MESMO carrinho e precisam compartilhar esta informação.
const latestResponse = new Map<string, Cart>()

interface CartMutationOptions<TVariables> {
  // Mudança otimista no cache, antes da resposta (ex.: quantidade nova).
  optimistic?: (cart: Cart, variables: TVariables) => Cart
  onSuccess?: (cart: Cart, variables: TVariables) => void
  notify?: boolean // toast em caso de erro (o cupom mostra o erro no campo)
}

// Toda alteração do carrinho passa por aqui. O problema que isto resolve:
// dois cliques rápidos no "+". Sem cuidado, os dois leem a quantidade ANTIGA
// (1) e os dois pedem "2". Então:
//   1. otimista: o cache muda na hora, e o 2º clique já lê 2 (e pede 3);
//   2. enquanto houver outra mutation em andamento, as respostas não são
//      gravadas (o número "piscaria" 2 e depois 3). Guardamos só a de maior versão;
//   3. a ÚLTIMA a terminar grava essa resposta. Se todas falharam, busca o
//      carrinho de novo (e isso desfaz a mudança otimista).
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>, options: CartMutationOptions<TVariables> = {}) {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null
  const queryKey = cartQueries.cart(userId).queryKey
  const mapKey = JSON.stringify(queryKey)

  return useMutation({
    mutationKey: CART_MUTATION,
    // scope: mutations do mesmo carrinho rodam EM FILA, na ordem dos cliques.
    // Em paralelo, o "quantidade 3" podia chegar ao servidor antes do
    // "quantidade 2" e o carrinho terminava em 2 (último a gravar vence).
    scope: { id: 'cart' },
    mutationFn,
    onMutate: async (variables) => {
      if (!options.optimistic) return
      // Um GET em andamento traria o carrinho antigo por cima da mudança otimista.
      await queryClient.cancelQueries({ queryKey })
      const current = queryClient.getQueryData<Cart>(queryKey)
      if (current) queryClient.setQueryData(queryKey, options.optimistic(current, variables))
    },
    onSuccess: (cart, variables) => {
      const best = latestResponse.get(mapKey)
      if (!best || cart.version > best.version) latestResponse.set(mapKey, cart)
      options.onSuccess?.(cart, variables)
    },
    onError: (error) => {
      if (options.notify !== false) notifyError(error)
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: CART_MUTATION }) > 1) return
      const latest = latestResponse.get(mapKey)
      latestResponse.delete(mapKey)
      if (latest) setCartData(queryClient, userId, latest)
      else void queryClient.invalidateQueries({ queryKey })
    },
  })
}

// Todas as alterações do carrinho. A resposta de cada uma é o carrinho
// inteiro, recalculado pela API (o front não soma totais).
export function useCartActions() {
  const add = useCartMutation((input: AddCartItemInput) => addCartItem(input))

  const update = useCartMutation(
    ({ itemId, input }: { itemId: string; input: UpdateCartItemInput }) => updateCartItem(itemId, input),
    {
      optimistic: (cart, { itemId, input }) => ({
        ...cart,
        items: cart.items.map((item) => (item.id === itemId && input.quantity ? { ...item, quantity: input.quantity } : item)),
      }),
    },
  )

  const remove = useCartMutation(({ itemId }: { itemId: string; name: string }) => removeCartItem(itemId), {
    optimistic: (cart, { itemId }) => ({ ...cart, items: cart.items.filter((item) => item.id !== itemId) }),
    onSuccess: (_cart, { name }) => toast.success(`${name} saiu do carrinho.`),
  })

  // Erros de cupom aparecem no próprio campo do formulário (sem toast).
  const coupon = useCartMutation((input: ApplyCouponInput) => applyCoupon(input), { notify: false })
  const clearCoupon = useCartMutation(() => removeCoupon())

  // Muda a quantidade por DELTA (+1/−1), lendo o valor atual do CACHE na hora
  // do clique (síncrono), e grava o otimista ANTES da mutation. Ler das props
  // falhava sob carga: o 2º clique rápido chegava antes do novo render, via a
  // quantidade antiga e pedia o mesmo número (2 em vez de 3).
  const { user } = useSession()
  const queryClient = useQueryClient()
  const changeQuantity = (itemId: string, delta: number) => {
    const key = cartQueries.cart(user?.id ?? null).queryKey
    const cart = queryClient.getQueryData<Cart>(key)
    const item = cart?.items.find((entry) => entry.id === itemId)
    if (!cart || !item) return
    const quantity = Math.max(1, item.quantity + delta)
    if (quantity === item.quantity) return
    queryClient.setQueryData<Cart>(key, {
      ...cart,
      items: cart.items.map((entry) => (entry.id === itemId ? { ...entry, quantity } : entry)),
    })
    update.mutate({ itemId, input: { quantity } })
  }

  return { add, update, changeQuantity, remove, coupon, clearCoupon }
}
