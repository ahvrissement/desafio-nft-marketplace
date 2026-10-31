import { delay, http } from 'msw'

import {
  addCartItemInputSchema,
  applyCouponInputSchema,
  cartSchema,
  mergeCartInputSchema,
  mergeCartResponseSchema,
  updateCartItemInputSchema,
} from '@/contracts/cart'
import { maxQuantityFor } from '@/contracts/nft'

import { COUPONS, findEdition, getOrCreateCart, isCouponExpired, toCartResponse, updateCart, type CartOwner } from '../cart'
import { randomToken } from '../crypto'
import { readDb, writeDb } from '../db'
import { readToken, requireSession } from '../session'
import { API, apiError, json, validationError } from '../utils'

const GUEST_ID = /^[A-Za-z0-9-]{8,64}$/

// De quem é este carrinho?
//   com token  → do usuário (token inválido/vencido = 401, como em qualquer rota)
//   sem token  → do visitante identificado pelo header X-Cart-Id
function resolveOwner(request: Request): CartOwner | { error: Response } {
  if (readToken(request)) {
    const session = requireSession(request)
    if ('error' in session) return session
    return { kind: 'user', userId: session.user.id }
  }
  const guestId = request.headers.get('X-Cart-Id')
  if (!guestId || !GUEST_ID.test(guestId)) return { error: apiError(400, 'VALIDATION_ERROR', 'Carrinho não identificado.') }
  return { kind: 'guest', cartId: guestId }
}

const respond = (owner: CartOwner) => json(cartSchema, toCartResponse(getOrCreateCart(owner)))

// Mensagem de estoque usada no "adicionar" e no "alterar quantidade".
function stockError(max: number) {
  return max === 0
    ? apiError(409, 'CONFLICT', 'Esta edição está esgotada.')
    : apiError(409, 'CONFLICT', `Só é possível ter ${max} ${max === 1 ? 'unidade' : 'unidades'} desta edição no carrinho.`)
}

export const cartHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    await delay()
    const owner = resolveOwner(request)
    if ('error' in owner) return owner.error
    return respond(owner)
  }),

  // Adiciona (ou soma, se a mesma edição já estiver no carrinho).
  http.post(`${API}/cart/items`, async ({ request }) => {
    await delay()
    const owner = resolveOwner(request)
    if ('error' in owner) return owner.error
    const parsed = addCartItemInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const { nftId, editionId, quantity } = parsed.data
    const found = findEdition(nftId, editionId)
    if (!found) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrados.')
    const max = maxQuantityFor(found.edition)
    const existing = getOrCreateCart(owner).items.find((item) => item.nftId === nftId && item.editionId === editionId)
    // A regra de estoque é do SERVIDOR: o front também limita o "+", mas quem
    // decide é aqui (outra aba, outro comprador ou um preço velho no cache).
    if ((existing?.quantity ?? 0) + quantity > max) return stockError(max)

    updateCart(owner, (cart) => {
      const item = cart.items.find((entry) => entry.nftId === nftId && entry.editionId === editionId)
      if (item) item.quantity += quantity
      else cart.items.push({ id: `item-${randomToken(6)}`, nftId, editionId, quantity, priceAtAdd: found.edition.price })
    })
    return respond(owner)
  }),

  http.patch(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    await delay()
    const owner = resolveOwner(request)
    if ('error' in owner) return owner.error
    const parsed = updateCartItemInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const item = getOrCreateCart(owner).items.find((entry) => entry.id === params.itemId)
    const found = item && findEdition(item.nftId, item.editionId)
    if (!item || !found) return apiError(404, 'NOT_FOUND', 'Item não está no carrinho.')
    const { quantity, acknowledgePrice } = parsed.data
    const max = maxQuantityFor(found.edition)
    // Diminuir sempre pode (é o jeito de corrigir um estoque que caiu); aumentar, só até o máximo.
    if (quantity !== undefined && quantity > item.quantity && quantity > max) return stockError(max)

    updateCart(owner, (cart) => {
      const target = cart.items.find((entry) => entry.id === item.id)!
      if (quantity !== undefined) target.quantity = quantity
      if (acknowledgePrice) target.priceAtAdd = found.edition.price
    })
    return respond(owner)
  }),

  http.delete(`${API}/cart/items/:itemId`, async ({ request, params }) => {
    await delay()
    const owner = resolveOwner(request)
    if ('error' in owner) return owner.error
    // Idempotente: remover o que já não está lá não é erro.
    updateCart(owner, (cart) => {
      cart.items = cart.items.filter((entry) => entry.id !== params.itemId)
    })
    return respond(owner)
  }),

  http.put(`${API}/cart/coupon`, async ({ request }) => {
    await delay()
    const owner = resolveOwner(request)
    if ('error' in owner) return owner.error
    const parsed = applyCouponInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const coupon = COUPONS.find((item) => item.code === parsed.data.code)
    if (!coupon) return apiError(422, 'VALIDATION_ERROR', 'Cupom inválido.', { code: ['Cupom inválido. Confira o código.'] })
    if (isCouponExpired(coupon)) {
      const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(coupon.expiresAt))
      return apiError(422, 'VALIDATION_ERROR', 'Cupom expirado.', { code: [`Este cupom expirou em ${date}.`] })
    }
    updateCart(owner, (cart) => {
      cart.couponCode = coupon.code
    })
    return respond(owner)
  }),

  http.delete(`${API}/cart/coupon`, async ({ request }) => {
    await delay()
    const owner = resolveOwner(request)
    if ('error' in owner) return owner.error
    updateCart(owner, (cart) => {
      cart.couponCode = null
    })
    return respond(owner)
  }),

  // No login: os itens do visitante passam para a conta. Mesma edição nos dois?
  // Soma, sem passar do máximo. O carrinho do visitante é apagado.
  http.post(`${API}/cart/merge`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = mergeCartInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const owner: CartOwner = { kind: 'user', userId: session.user.id }
    const guestKey = `guest:${parsed.data.guestCartId}`
    const guest = readDb().carts[guestKey]
    let mergedItems = 0
    if (guest && guest.items.length > 0) {
      updateCart(owner, (cart) => {
        for (const guestItem of guest.items) {
          const found = findEdition(guestItem.nftId, guestItem.editionId)
          if (!found) continue
          const max = maxQuantityFor(found.edition)
          const item = cart.items.find((entry) => entry.nftId === guestItem.nftId && entry.editionId === guestItem.editionId)
          if (item) item.quantity = Math.max(1, Math.min(item.quantity + guestItem.quantity, max))
          else cart.items.push({ ...guestItem, quantity: Math.max(1, Math.min(guestItem.quantity, max)) })
          mergedItems += 1
        }
        cart.couponCode ??= guest.couponCode
      })
    }
    writeDb((db) => {
      delete db.carts[guestKey]
    })
    return json(mergeCartResponseSchema, { cart: toCartResponse(getOrCreateCart(owner)), mergedItems })
  }),
]
