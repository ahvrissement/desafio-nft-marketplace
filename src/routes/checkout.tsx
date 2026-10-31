import { createFileRoute } from '@tanstack/react-router'

import { requireAuth } from '@/features/auth/require-auth'
import { CheckoutPage } from '@/features/checkout/components/checkout-page'

// /checkout: PRIVADA. O beforeLoad roda antes de qualquer coisa da tela: sem
// sessão, a pessoa volta ao carrinho com o login aberto e, depois de entrar,
// segue para cá.
export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context, location }) => requireAuth({ context, location, fallback: '/cart' }),
  component: CheckoutPage,
})
