import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { authResponseSchema } from '@/contracts/auth'
import { cartSchema } from '@/contracts/cart'
import { orderSchema, quoteSchema, type CreateOrderInput } from '@/contracts/checkout'

import { readDb, resetDb, writeDb } from '../db'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { checkoutHandlers } from './checkout'

const server = setupServer(...authHandlers, ...cartHandlers, ...checkoutHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => resetDb())

async function call(method: string, path: string, token: string, body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`http://localhost/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

async function login(email: string) {
  const response = await fetch('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Kurio@123' }),
  })
  return authResponseSchema.parse(await response.json()).token
}

const emerald = () => readDb().nfts.find((nft) => nft.id === 'emerald-ape-042')!.editions.find((item) => item.id === '1-50')!

function orderInput(quoteId: string): CreateOrderInput {
  return {
    quoteId,
    buyer: { displayName: 'Ana', username: 'ana', email: 'ana@kurio.dev', profileName: 'Ana Kurio', ensName: 'ana.kurio.eth' },
    wallet: { provider: 'metamask', network: 'ethereum', address: '0xa91f3c2b7d4e5f60718293a4b5c6d7e8f90ae82c', walletId: 'wallet-ana-principal' },
  }
}

// Faz a "rede" decidir já (em vez de esperar 2,5s).
const settleNow = () =>
  writeDb((db) => {
    for (const order of db.orders) order.settleAt = new Date(Date.now() - 1).toISOString()
  })

async function setup() {
  const token = await login('ana@kurio.dev')
  await call('POST', '/cart/items', token, { nftId: 'emerald-ape-042', editionId: '1-50', quantity: 3 })
  const quote = quoteSchema.parse((await call('GET', '/checkout/quote', token)).body)
  return { token, quote }
}

describe('pedido', () => {
  it('cria pendente; mesma chave e mesmo conteúdo devolvem o MESMO pedido', async () => {
    const { token, quote } = await setup()
    const headers = { 'Idempotency-Key': 'tentativa-0000000001' }
    const first = await call('POST', '/orders', token, orderInput(quote.id), headers)
    const again = await call('POST', '/orders', token, orderInput(quote.id), headers)
    expect(first.status).toBe(201)
    expect(orderSchema.parse(first.body).status).toBe('pending')
    expect(again.status).toBe(200)
    expect(again.body.id).toBe(first.body.id)
    expect(readDb().orders).toHaveLength(1)
  })

  it('mesma chave com conteúdo diferente → 409 IDEMPOTENCY_CONFLICT', async () => {
    const { token, quote } = await setup()
    const headers = { 'Idempotency-Key': 'tentativa-0000000002' }
    await call('POST', '/orders', token, orderInput(quote.id), headers)
    const base = orderInput(quote.id)
    const other: CreateOrderInput = { ...base, wallet: { ...base.wallet, provider: 'coinbase' } }
    const conflict = await call('POST', '/orders', token, other, headers)
    expect(conflict.status).toBe(409)
    expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT')
  })

  it('preço mudou depois da cotação → 409 QUOTE_CHANGED e nenhum pedido criado', async () => {
    const { token, quote } = await setup()
    writeDb(() => {
      emerald().price = '1.25'
    })
    const result = await call('POST', '/orders', token, orderInput(quote.id), { 'Idempotency-Key': 'tentativa-0000000003' })
    expect(result.status).toBe(409)
    expect(result.body.error.code).toBe('QUOTE_CHANGED')
    expect(readDb().orders).toHaveLength(0)
  })

  it('confirmado: baixa o estoque, tira do carrinho só o comprado e o recibo não muda depois', async () => {
    const { token, quote } = await setup()
    const stockBefore = emerald().available!
    const created = orderSchema.parse(
      (await call('POST', '/orders', token, orderInput(quote.id), { 'Idempotency-Key': 'tentativa-0000000004' })).body,
    )
    // Depois de pagar, adiciona mais 1 da mesma edição: esse 1 deve ficar no carrinho.
    await call('POST', '/cart/items', token, { nftId: 'emerald-ape-042', editionId: '1-50', quantity: 1 })
    settleNow()

    const order = orderSchema.parse((await call('GET', `/orders/${created.id}`, token)).body)
    expect(order.status).toBe('confirmed')
    expect(order.transaction?.hash).toMatch(/^0x/)
    expect(emerald().available).toBe(stockBefore - 3)
    const cart = cartSchema.parse((await call('GET', '/cart', token)).body)
    expect(cart.items.map((item) => item.quantity)).toEqual([1])

    // O catálogo muda; o recibo continua com o preço pago.
    writeDb(() => {
      emerald().price = '9.99'
    })
    const receipt = orderSchema.parse((await call('GET', `/orders/${created.id}`, token)).body)
    expect(receipt.items[0].unitPrice).toBe('1.19')
    expect(receipt.summary.total).toBe(order.summary.total)
  })

  it('recusado: carrinho e estoque intactos; estado terminal', async () => {
    const { token, quote } = await setup()
    writeDb((db) => {
      db.scenarios.payment = 'decline'
    })
    const stockBefore = emerald().available
    const created = orderSchema.parse(
      (await call('POST', '/orders', token, orderInput(quote.id), { 'Idempotency-Key': 'tentativa-0000000005' })).body,
    )
    settleNow()
    const order = orderSchema.parse((await call('GET', `/orders/${created.id}`, token)).body)
    expect(order.status).toBe('declined')
    expect(emerald().available).toBe(stockBefore)
    expect(cartSchema.parse((await call('GET', '/cart', token)).body).items[0].quantity).toBe(3)
    // Mudar o cenário depois não "ressuscita" um pedido recusado
    writeDb((db) => {
      db.scenarios.payment = 'confirm'
    })
    expect((await call('GET', `/orders/${created.id}`, token)).body.status).toBe('declined')
  })

  it('pedido de outra pessoa responde 404', async () => {
    const { token, quote } = await setup()
    const created = (await call('POST', '/orders', token, orderInput(quote.id), { 'Idempotency-Key': 'tentativa-0000000006' })).body
    const pedro = await login('pedro@kurio.dev')
    expect((await call('GET', `/orders/${created.id}`, pedro)).status).toBe(404)
  })

  it('carteira pode recusar a conexão (cenário)', async () => {
    const token = await login('ana@kurio.dev')
    writeDb((db) => {
      db.scenarios.walletConnect = 'decline'
    })
    const result = await call('POST', '/wallet/connect', token, { provider: 'metamask', address: '0xa91f3c2b7d4e5f60718293a4b5c6d7e8f90ae82c' })
    expect(result.status).toBe(403)
    expect(result.body.error.code).toBe('WALLET_DECLINED')
  })
})
