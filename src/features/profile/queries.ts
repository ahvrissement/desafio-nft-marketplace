import { queryOptions, type QueryClient } from '@tanstack/react-query'

import type { User } from '@/contracts/auth'
import type { Profile } from '@/contracts/profile'
import { authQueries } from '@/features/auth/queries'

import { fetchProfile } from './api'

export const profileQueries = {
  profile: (userId: string) =>
    queryOptions({ queryKey: ['me', userId, 'profile'] as const, queryFn: ({ signal }) => fetchProfile(signal) }),
}

// O perfil salvo também muda o que o header mostra (nome, avatar): atualiza a
// sessão no cache com a resposta da API, sem buscar de novo.
export function applyProfile(queryClient: QueryClient, userId: string, profile: Profile) {
  queryClient.setQueryData(profileQueries.profile(userId).queryKey, profile)
  queryClient.setQueryData<User | null>(authQueries.session().queryKey, (user) =>
    user && { ...user, name: profile.displayName, email: profile.email, avatarUrl: profile.avatarUrl },
  )
}
