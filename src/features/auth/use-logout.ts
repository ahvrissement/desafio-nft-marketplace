import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { logout } from './api'
import { endSession } from './queries'

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    // onSettled (e não onSuccess): mesmo se a API falhar, a sessão local acaba.
    // Sair é uma promessa ao usuário; ele não pode ficar "preso" logado.
    onSettled: () => {
      endSession(queryClient)
      toast.success('Você saiu da sua conta.')
    },
  })
}
