import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { setFavorite } from '@/features/auth/api'
import { authQueries } from '@/features/auth/queries'
import { useAuthDialog } from '@/features/auth/use-auth-dialog'
import { useSession } from '@/features/auth/use-session'

const MUTATION_KEY = ['favorites', 'toggle'] as const

// Lista de favoritos do usuário logado. Visitante: lista vazia, sem requisição.
export function useFavoriteIds() {
  const { user } = useSession()
  const { data } = useQuery({ ...authQueries.favorites(user?.id ?? ''), enabled: Boolean(user) })
  return new Set(data ?? [])
}

interface ToggleVariables {
  nftId: string
  nftName: string
  favorite: boolean // o estado DESEJADO (true = favoritar)
}

// Favoritar com atualização OTIMISTA (o README exige pelo menos uma, com rollback):
//   1. onMutate: muda o cache NA HORA (o coração preenche sem esperar a API)
//      e guarda uma "foto" do estado anterior;
//   2. onError: volta para a foto (rollback) e avisa;
//   3. onSettled: sincroniza com o servidor, que é a fonte da verdade.
export function useToggleFavorite() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const dialog = useAuthDialog()
  const favoriteIds = useFavoriteIds()
  const queryKey = authQueries.favorites(user?.id ?? '').queryKey

  const mutation = useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: ({ nftId, favorite }: ToggleVariables) => setFavorite(nftId, favorite),
    onMutate: async ({ nftId, favorite }) => {
      // Cancela um GET de favoritos em andamento: a resposta dele (antiga)
      // chegaria depois e apagaria a nossa mudança otimista.
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<string[]>(queryKey)
      queryClient.setQueryData<string[]>(queryKey, (current = []) =>
        favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId),
      )
      return { previous }
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous)
      // Sessão expirada já tem o próprio aviso (com o botão "Entrar").
      if (error.code !== 'SESSION_EXPIRED') toast.error('Não foi possível atualizar seus favoritos. Tente de novo.')
    },
    onSuccess: (_ids, { nftName, favorite }) => {
      toast.success(favorite ? `${nftName} foi para os seus favoritos.` : `${nftName} saiu dos seus favoritos.`)
    },
    onSettled: () => {
      // Vários cliques rápidos = várias mutations. Só a ÚLTIMA a terminar
      // busca do servidor; senão uma resposta intermediária "desfaria" um clique.
      if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) === 1) void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    isFavorite: (nftId: string) => favoriteIds.has(nftId),
    toggle: (nftId: string, nftName: string) => {
      // Favoritos exigem login (README). Visitante: abre o login na mesma página.
      if (!user) {
        toast.info('Entre na sua conta para salvar favoritos.')
        dialog.open('entrar')
        return
      }
      mutation.mutate({ nftId, nftName, favorite: !favoriteIds.has(nftId) })
    },
  }
}
