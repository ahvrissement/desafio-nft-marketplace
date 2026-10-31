import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { createOrder } from './api'
import type { CheckoutAttempt } from './attempt'

// Envia o pedido. Duas proteções contra pedido duplicado:
//   1. enquanto envia, o botão fica travado (isPending): clique duplo não reenvia;
//   2. timeout/queda de rede → reenvia sozinho com a MESMA Idempotency-Key
//      (seguro: a API devolve o pedido já criado em vez de criar outro).
export function usePlaceOrder() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: ({ key, input }: CheckoutAttempt) => createOrder(input, key),
    retry: (failureCount, error) => error.isRetryable && failureCount < 2,
    onSuccess: (order) => void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true }),
  })
}
