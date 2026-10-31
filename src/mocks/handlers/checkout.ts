import { delay, http } from 'msw'

import {
  connectWalletInputSchema,
  connectWalletResponseSchema,
  createOrderInputSchema,
  orderSchema,
  quoteSchema,
  walletsResponseSchema,
} from '@/contracts/checkout'

import { buildQuote, createOrder, fingerprint, settleIfDue, toOrderResponse } from '../checkout'
import { readDb, writeDb } from '../db'
import { requireSession } from '../session'
import { API, apiError, json, validationError } from '../utils'

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/

export const checkoutHandlers = [
  http.get(`${API}/me/wallets`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    return json(walletsResponseSchema, { items: readDb().wallets[session.user.id] ?? [] })
  }),

  // Simula o "conectar" da extensão da carteira (que pode recusar).
  http.post(`${API}/wallet/connect`, async ({ request }) => {
    await delay(600)
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = connectWalletInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    if (readDb().scenarios.walletConnect === 'decline') {
      return apiError(403, 'WALLET_DECLINED', 'A carteira recusou a conexão. Abra a extensão e autorize o Kurio.')
    }
    return json(connectWalletResponseSchema, { ...parsed.data, connectedAt: new Date().toISOString() })
  }),

  http.get(`${API}/checkout/quote`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    return json(quoteSchema, buildQuote(session.user.id))
  }),

  // Cria o pedido. Idempotente pela chave:
  //   mesma chave + mesmo conteúdo     → devolve o MESMO pedido (reenvio após timeout)
  //   mesma chave + conteúdo diferente → 409 IDEMPOTENCY_CONFLICT
  // E revalida a cotação: se algo mudou, 409 QUOTE_CHANGED (nova confirmação).
  http.post(`${API}/orders`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const key = request.headers.get('Idempotency-Key')
    if (!key || !IDEMPOTENCY_KEY.test(key)) return apiError(400, 'VALIDATION_ERROR', 'Envie uma Idempotency-Key válida.')
    const parsed = createOrderInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const userId = session.user.id
    const bodyHash = fingerprint(parsed.data)
    const previous = readDb().idempotency[`${userId}:${key}`]
    if (previous) {
      if (previous.bodyHash !== bodyHash) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada para outro pedido.')
      }
      const existing = readDb().orders.find((order) => order.id === previous.orderId)!
      settleIfDue(existing.id)
      return json(orderSchema, toOrderResponse(readDb().orders.find((order) => order.id === existing.id)!))
    }

    const quote = buildQuote(userId)
    if (quote.blocked) return apiError(409, 'QUOTE_CHANGED', 'Algum item esgotou ou está acima do estoque. Revise o pedido.')
    if (quote.id !== parsed.data.quoteId) {
      return apiError(409, 'QUOTE_CHANGED', 'Preço, estoque, cupom ou taxa mudaram. Revise os novos valores e confirme de novo.')
    }

    const order = createOrder(userId, parsed.data, quote)
    writeDb((db) => {
      db.idempotency[`${userId}:${key}`] = { bodyHash, orderId: order.id }
    })
    // Cenário "timeout após criar": o pedido EXISTE, mas a resposta demora mais
    // que o timeout do cliente (10s). O cliente reenvia com a mesma chave e
    // recebe este mesmo pedido.
    if (readDb().scenarios.orderTimeout) await delay(12_000)
    return json(orderSchema, toOrderResponse(order), { status: 201 })
  }),

  http.get(`${API}/orders/:orderId`, async ({ request, params }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    // Pedido de OUTRA pessoa responde 404 (e não 403): nem confirma que ele existe.
    const order = readDb().orders.find((item) => item.id === params.orderId && item.userId === session.user.id)
    if (!order) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    settleIfDue(order.id)
    return json(orderSchema, toOrderResponse(readDb().orders.find((item) => item.id === order.id)!))
  }),
]
