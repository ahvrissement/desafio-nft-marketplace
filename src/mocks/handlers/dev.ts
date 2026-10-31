import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'

import { ethAmountSchema } from '@/contracts/common'

import { readDb, resetDb, writeDb, type DbScenarios } from '../db'
import { API, apiError, validationError } from '../utils'

// Rotas de "bastidor" do mock (prefixo __dev): o painel de cenários e os testes
// E2E usam para controlar o backend falso. Não fazem parte da API do produto.

const scenariosSchema = z
  .object({
    walletConnect: z.enum(['approve', 'decline']),
    payment: z.enum(['confirm', 'decline']),
    orderTimeout: z.boolean(),
  })
  .partial()

const nftUpdateSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  price: ethAmountSchema.optional(),
  available: z.number().int().nonnegative().nullable().optional(),
})

export const devHandlers = [
  http.get(`${API}/__dev/scenarios`, () => HttpResponse.json(readDb().scenarios)),

  http.put(`${API}/__dev/scenarios`, async ({ request }) => {
    const parsed = scenariosSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    writeDb((db) => {
      db.scenarios = { ...db.scenarios, ...(parsed.data as Partial<DbScenarios>) }
    })
    return HttpResponse.json(readDb().scenarios)
  }),

  // Simula "outra pessoa comprou" ou "o criador mudou o preço".
  http.post(`${API}/__dev/nft-update`, async ({ request }) => {
    await delay()
    const parsed = nftUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const { nftId, editionId, price, available } = parsed.data
    const nft = readDb().nfts.find((item) => item.id === nftId)
    if (!nft?.editions.some((item) => item.id === editionId)) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrados.')
    writeDb((db) => {
      const target = db.nfts.find((item) => item.id === nftId)!
      const edition = target.editions.find((item) => item.id === editionId)!
      if (price !== undefined) edition.price = price
      if (available !== undefined) edition.available = available
      if (editionId === target.defaultEditionId && price !== undefined) target.price = price
      target.version += 1
    })
    return HttpResponse.json({ ok: true })
  }),

  // Volta TUDO ao cenário conhecido (README: "o reset deve restaurar integralmente").
  http.post(`${API}/__dev/reset`, () => {
    resetDb()
    return new HttpResponse(null, { status: 204 })
  }),
]
