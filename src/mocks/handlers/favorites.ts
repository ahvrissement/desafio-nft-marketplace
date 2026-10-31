import { delay, http } from 'msw'

import { favoriteNftsResponseSchema, favoritesResponseSchema } from '@/contracts/auth'

import { readDb, writeDb } from '../db'
import { requireSession } from '../session'
import { API, apiError, json } from '../utils'
import { toSummary } from './nfts'

const favoritesOf = (userId: string) => readDb().favorites[userId] ?? []

export const favoritesHandlers = [
  // GET /api/me/favorites → { nftIds }. "me" = o usuário DONO do token:
  // não existe /users/:id/favorites, então ninguém lê os favoritos de outro.
  http.get(`${API}/me/favorites`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    return json(favoritesResponseSchema, { nftIds: favoritesOf(session.user.id) })
  }),

  // O mais recente primeiro (ordem em que foram favoritados, invertida).
  http.get(`${API}/me/favorites/nfts`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const { nfts } = readDb()
    const items = favoritesOf(session.user.id)
      .toReversed()
      .map((id) => nfts.find((nft) => nft.id === id))
      .filter((nft) => nft !== undefined)
      .map(toSummary)
    return json(favoriteNftsResponseSchema, { items })
  }),

  // PUT e DELETE são idempotentes: favoritar duas vezes dá o mesmo resultado
  // que uma. Por isso não são POST/toggle: um clique repetido não "desfaz".
  http.put(`${API}/me/favorites/:nftId`, async ({ request, params }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const nftId = String(params.nftId)
    if (!readDb().nfts.some((nft) => nft.id === nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    writeDb((db) => {
      const current = db.favorites[session.user.id] ?? []
      if (!current.includes(nftId)) db.favorites[session.user.id] = [...current, nftId]
    })
    return json(favoritesResponseSchema, { nftIds: favoritesOf(session.user.id) })
  }),

  http.delete(`${API}/me/favorites/:nftId`, async ({ request, params }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    writeDb((db) => {
      db.favorites[session.user.id] = (db.favorites[session.user.id] ?? []).filter((id) => id !== params.nftId)
    })
    return json(favoritesResponseSchema, { nftIds: favoritesOf(session.user.id) })
  }),
]
