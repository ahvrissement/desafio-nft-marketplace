import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { AuthResponse } from '@/contracts/auth'
import { mergeGuestCart } from '@/features/cart/api'
import { clearGuestCartId, getGuestCartId } from '@/features/cart/guest-cart'
import { cartQueries } from '@/features/cart/queries'

import { startSession } from './queries'
import { setToken } from './token-store'
import { useAuthDialog } from './use-auth-dialog'

// O que acontece depois de entrar ou criar a conta, nos dois formulários:
// guarda o token, troca o usuário do cache, traz o carrinho do visitante,
// avisa e volta para onde estava.
export function useAuthSuccess() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { redirect } = useSearch({ strict: false })
  const dialog = useAuthDialog()

  return async (response: AuthResponse, message: string) => {
    setToken(response.token)
    startSession(queryClient, response.user)

    // README: "preservar os itens do visitante ao autenticar".
    const guestCartId = getGuestCartId({ create: false })
    if (guestCartId) {
      try {
        const { cart, mergedItems } = await mergeGuestCart(guestCartId)
        queryClient.setQueryData(cartQueries.cart(response.user.id).queryKey, cart)
        if (mergedItems > 0) toast.info('Os itens que você escolheu foram para o carrinho da sua conta.')
      } catch {
        // Falhou a junção: o carrinho da conta é carregado normalmente e o do
        // visitante continua salvo para a próxima tentativa.
      } finally {
        if (queryClient.getQueryData(cartQueries.cart(response.user.id).queryKey)) clearGuestCartId()
        queryClient.removeQueries({ queryKey: cartQueries.cart(null).queryKey })
      }
    }

    toast.success(message)
    // Veio de uma rota privada (ex.: checkout)? Volta para ela. Senão, só fecha
    // o modal: a pessoa continua exatamente na página em que estava.
    if (redirect) void router.navigate({ href: redirect, replace: true })
    else dialog.close()
  }
}

export const firstName = (name: string) => name.split(' ')[0]
