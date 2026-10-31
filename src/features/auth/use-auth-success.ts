import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { AuthResponse } from '@/contracts/auth'

import { startSession } from './queries'
import { setToken } from './token-store'
import { useAuthDialog } from './use-auth-dialog'

// O que acontece depois de entrar ou criar a conta, nos dois formulários:
// guarda o token, troca o usuário do cache, avisa e volta para onde estava.
export function useAuthSuccess() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { redirect } = useSearch({ strict: false })
  const dialog = useAuthDialog()

  return (response: AuthResponse, message: string) => {
    setToken(response.token)
    startSession(queryClient, response.user)
    toast.success(message)
    // Veio de uma rota privada (ex.: checkout)? Volta para ela. Senão, só fecha
    // o modal: a pessoa continua exatamente na página em que estava.
    if (redirect) void router.navigate({ href: redirect, replace: true })
    else dialog.close()
  }
}

export const firstName = (name: string) => name.split(' ')[0]
