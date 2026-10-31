import { createFileRoute } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/require-auth'
import { OrderPage } from '@/features/orders/components/order-page'

// /orders/:orderId: o acompanhamento do pedido (pendente → confirmado/recusado).
// O id na URL é o que permite recuperar o estado depois de um F5.
export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location, fallback: '/' }),
  component: OrderPage,
})
