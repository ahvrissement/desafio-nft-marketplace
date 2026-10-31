import {
  authResponseSchema,
  favoriteNftsResponseSchema,
  favoritesResponseSchema,
  sessionResponseSchema,
  type LoginInput,
  type SignupInput,
} from '@/contracts/auth'
import { http, request } from '@/lib/http'

import { getToken } from './token-store'

export function login(input: LoginInput) {
  return request(authResponseSchema, { method: 'POST', url: '/auth/login', data: input })
}

export function signup(input: SignupInput) {
  return request(authResponseSchema, { method: 'POST', url: '/auth/signup', data: input })
}

// Sem token, nem pergunta à API: o visitante simplesmente não tem sessão.
export async function fetchSession(signal?: AbortSignal) {
  if (!getToken()) return null
  const { user } = await request(sessionResponseSchema, { url: '/auth/session', signal })
  return user
}

export async function logout() {
  await http.post('/auth/logout')
}

export async function fetchFavorites(signal?: AbortSignal) {
  const { nftIds } = await request(favoritesResponseSchema, { url: '/me/favorites', signal })
  return nftIds
}

export async function fetchFavoriteNfts(signal?: AbortSignal) {
  const { items } = await request(favoriteNftsResponseSchema, { url: '/me/favorites/nfts', signal })
  return items
}

export async function setFavorite(nftId: string, favorite: boolean) {
  const { nftIds } = await request(favoritesResponseSchema, {
    method: favorite ? 'PUT' : 'DELETE',
    url: `/me/favorites/${encodeURIComponent(nftId)}`,
  })
  return nftIds
}
