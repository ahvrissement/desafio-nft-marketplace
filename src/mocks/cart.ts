import type { Cart, CartItem, CartItemIssue } from '@/contracts/cart'
import { maxQuantityFor, type Network, type Nft, type NftEdition } from '@/contracts/nft'
import { addEth, compareEth, multiplyEth, percentOfEth, subtractEth } from '@/lib/money'

import { randomToken } from './crypto'
import { readDb, writeDb, type DbCart } from './db'

// Cupons do cenário padrão. Fixos e conhecidos, para os testes.
export const COUPONS = [
  { code: 'KURIO10', label: '10% de desconto de lançamento', discountBps: 1_000, expiresAt: '2027-12-31T23:59:59.000Z' },
  { code: 'GENESIS5', label: '5% para colecionadores gênesis', discountBps: 500, expiresAt: '2027-12-31T23:59:59.000Z' },
  { code: 'BOASVINDAS', label: '15% de boas-vindas', discountBps: 1_500, expiresAt: '2026-01-31T23:59:59.000Z' }, // vencido
]

// Taxa de rede ("gas") estimada: uma por rede presente no pedido.
// 0.016 na Ethereum = o valor do Figma.
export const NETWORK_FEES: Record<Network, string> = { ethereum: '0.016', polygon: '0.002', solana: '0.001' }

export type CartOwner = { kind: 'user'; userId: string } | { kind: 'guest'; cartId: string }

export const cartKey = (owner: CartOwner) => (owner.kind === 'user' ? `user:${owner.userId}` : `guest:${owner.cartId}`)

export function findEdition(nftId: string, editionId: string): { nft: Nft; edition: NftEdition } | null {
  const nft = readDb().nfts.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  return nft && edition ? { nft, edition } : null
}

// Lê o carrinho do dono, criando um vazio se ainda não existir.
export function getOrCreateCart(owner: CartOwner): DbCart {
  const key = cartKey(owner)
  const existing = readDb().carts[key]
  if (existing) return existing
  const cart: DbCart = { id: owner.kind === 'guest' ? owner.cartId : `cart-${randomToken(6)}`, version: 0, items: [], couponCode: null }
  writeDb((db) => {
    db.carts[key] = cart
  })
  return readDb().carts[key]
}

// Toda alteração passa por aqui: muda o carrinho e sobe a versão.
export function updateCart(owner: CartOwner, mutate: (cart: DbCart) => void): DbCart {
  getOrCreateCart(owner)
  writeDb((db) => {
    const cart = db.carts[cartKey(owner)]
    mutate(cart)
    cart.version += 1
  })
  return readDb().carts[cartKey(owner)]
}

export function isCouponExpired(coupon: (typeof COUPONS)[number]) {
  return Date.parse(coupon.expiresAt) <= Date.now()
}

// Monta a RESPOSTA do carrinho: preço e estoque de AGORA, avisos e o resumo.
// É chamada em toda leitura, então uma mudança de preço no catálogo aparece no
// próximo GET (e, no passo do Socket.IO, também por evento).
export function toCartResponse(cart: DbCart): Cart {
  const items: CartItem[] = []
  for (const item of cart.items) {
    const found = findEdition(item.nftId, item.editionId)
    if (!found) continue // NFT removido do catálogo: o item some
    const { nft, edition } = found
    const maxQuantity = maxQuantityFor(edition)
    const issues: CartItemIssue[] = []
    const priceChanged = compareEth(edition.price, item.priceAtAdd) !== 0
    if (priceChanged) issues.push('price_changed')
    if (maxQuantity === 0) issues.push('sold_out')
    else if (item.quantity > maxQuantity) issues.push('insufficient_stock')

    items.push({
      id: item.id,
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      editionLabel: edition.label,
      network: nft.network,
      image: nft.images[0],
      quantity: item.quantity,
      maxQuantity,
      unitPrice: edition.price,
      previousUnitPrice: priceChanged ? item.priceAtAdd : null,
      lineTotal: multiplyEth(edition.price, item.quantity),
      issues,
    })
  }

  // Itens esgotados não entram na conta: não dá para comprá-los.
  const payable = items.filter((item) => !item.issues.includes('sold_out'))
  const subtotal = addEth('0', ...payable.map((item) => item.lineTotal))
  const coupon = COUPONS.find((item) => item.code === cart.couponCode && !isCouponExpired(item)) ?? null
  const discount = coupon ? percentOfEth(subtotal, coupon.discountBps) : '0.00'
  const networks = new Set(payable.map((item) => item.network))
  const networkFee = addEth('0', ...[...networks].map((network) => NETWORK_FEES[network]))

  return {
    id: cart.id,
    version: cart.version,
    items,
    summary: {
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      subtotal,
      discount,
      networkFee,
      total: addEth(subtractEth(subtotal, discount), networkFee),
      coupon: coupon && { code: coupon.code, label: coupon.label, discountBps: coupon.discountBps },
    },
  }
}
