import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { authResponseSchema } from '@/contracts/auth'
import { cartSchema, mergeCartResponseSchema, type Cart } from '@/contracts/cart'

import { resetDb, writeDb } from '../db'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'

const server = setupServer(...authHandlers, ...cartHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => resetDb())

type Who = { guest: string } | { token: string }

async function call(method: string, path: string, who: Who, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if ('guest' in who) headers['X-Cart-Id'] = who.guest
  else headers.Authorization = `Bearer ${who.token}`
  const response = await fetch(`http://localhost/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  return { status: response.status, body: await response.json() }
}

const guest = { guest: 'visitante-teste-1' }
const add = async (who: Who, nftId: string, editionId: string, quantity: number) => call('POST', '/cart/items', who, { nftId, editionId, quantity })
const cartOf = async (who: Who): Promise<Cart> => cartSchema.parse((await call('GET', '/cart', who)).body)

describe('carrinho', () => {
  it('calcula como o Figma: 2 × 1.19 = 2.38, taxa 0.016', async () => {
    const { status, body } = await add(guest, 'emerald-ape-042', '1-50', 2)
    expect(status).toBe(200)
    const cart = cartSchema.parse(body)
    expect(cart.items[0]).toMatchObject({ unitPrice: '1.19', lineTotal: '2.38', quantity: 2, issues: [] })
    expect(cart.summary).toMatchObject({ itemCount: 2, subtotal: '2.38', discount: '0.00', networkFee: '0.016', total: '2.396' })
  })

  it('soma a mesma edição e sobe a versão a cada alteração', async () => {
    await add(guest, 'emerald-ape-042', '1-50', 1)
    const second = cartSchema.parse((await add(guest, 'emerald-ape-042', '1-50', 2)).body)
    expect(second.items).toHaveLength(1)
    expect(second.items[0].quantity).toBe(3)
    expect(second.version).toBe(2)
  })

  it('recusa com 409 acima do estoque e edição esgotada', async () => {
    expect((await add(guest, 'emerald-ape-042', '1-50', 11)).status).toBe(400) // acima do limite por pedido
    const soldOut = await add(guest, 'emerald-ape-042', '1-1', 1) // a 1/1 do Emerald está esgotada no seed
    expect(soldOut.status).toBe(409)
    expect(soldOut.body.error.message).toBe('Esta edição está esgotada.')
    const tooMany = await add(guest, 'emerald-ape-042', '1-10', 5) // só 4 em estoque
    expect(tooMany.status).toBe(409)
    expect(tooMany.body.error.message).toContain('4 unidades')
  })

  it('cupom válido, inválido e vencido', async () => {
    await add(guest, 'emerald-ape-042', '1-50', 2)
    const valid = cartSchema.parse((await call('PUT', '/cart/coupon', guest, { code: ' kurio10 ' })).body)
    expect(valid.summary).toMatchObject({ discount: '0.238', total: '2.158', coupon: { code: 'KURIO10' } })
    const invalid = await call('PUT', '/cart/coupon', guest, { code: 'NAOEXISTE' })
    expect(invalid.status).toBe(422)
    expect(invalid.body.error.fieldErrors.code[0]).toContain('inválido')
    const expired = await call('PUT', '/cart/coupon', guest, { code: 'BOASVINDAS' })
    expect(expired.body.error.fieldErrors.code[0]).toContain('expirou')
    const removed = cartSchema.parse((await call('DELETE', '/cart/coupon', guest)).body)
    expect(removed.summary.coupon).toBeNull()
  })

  it('avisa preço alterado e estoque insuficiente, e tira o esgotado do total', async () => {
    await add(guest, 'emerald-ape-042', '1-50', 3)
    writeDb((db) => {
      const edition = db.nfts.find((nft) => nft.id === 'emerald-ape-042')!.editions.find((item) => item.id === '1-50')!
      edition.price = '1.25'
      edition.available = 2
    })
    let cart = await cartOf(guest)
    expect(cart.items[0]).toMatchObject({ previousUnitPrice: '1.19', unitPrice: '1.25', issues: ['price_changed', 'insufficient_stock'] })
    // Diminuir para caber no estoque e confirmar o preço novo
    cart = cartSchema.parse((await call('PATCH', `/cart/items/${cart.items[0].id}`, guest, { quantity: 2, acknowledgePrice: true })).body)
    expect(cart.items[0].issues).toEqual([])

    writeDb((db) => {
      db.nfts.find((nft) => nft.id === 'emerald-ape-042')!.editions.find((item) => item.id === '1-50')!.available = 0
    })
    cart = await cartOf(guest)
    expect(cart.items[0].issues).toContain('sold_out')
    expect(cart.summary).toMatchObject({ subtotal: '0.00', networkFee: '0.00', total: '0.00' })
  })

  it('visitantes diferentes têm carrinhos diferentes', async () => {
    await add(guest, 'emerald-ape-042', '1-50', 1)
    expect((await cartOf({ guest: 'outro-visitante-2' })).items).toHaveLength(0)
  })

  it('no login, junta o carrinho do visitante ao da conta', async () => {
    const login = authResponseSchema.parse((await (await fetch('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ana@kurio.dev', password: 'Kurio@123' }),
    })).json()))
    const ana = { token: login.token }
    await add(ana, 'emerald-ape-042', '1-50', 2)
    await add(guest, 'emerald-ape-042', '1-50', 3)
    await add(guest, 'sage-nomad-009', '1-50', 1)

    const merged = mergeCartResponseSchema.parse((await call('POST', '/cart/merge', ana, { guestCartId: guest.guest })).body)
    expect(merged.mergedItems).toBe(2)
    expect(merged.cart.items.map((item) => [item.nftId, item.quantity])).toEqual([['emerald-ape-042', 5], ['sage-nomad-009', 1]])
    expect((await cartOf(guest)).items).toHaveLength(0) // o do visitante foi apagado
  })
})
