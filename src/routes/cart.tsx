import { createFileRoute } from '@tanstack/react-router'

import { CartPage } from '@/features/cart/components/cart-page'

// /cart: público. Visitante também tem carrinho (o README pede que ele seja
// preservado ao entrar na conta). O checkout é que exige login.
export const Route = createFileRoute('/cart')({
  component: CartPage,
})
