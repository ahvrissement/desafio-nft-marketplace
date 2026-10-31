import { WALLET_PROVIDER_LABELS, type CreateOrderInput, type Order, type Quote } from '@/contracts/checkout'

import { getOrCreateCart, toCartResponse } from './cart'
import { randomToken } from './crypto'
import { readDb, writeDb, type DbOrder } from './db'

// Quanto tempo a "rede" leva para decidir o pagamento.
export const SETTLE_DELAY_MS = 2_500

// Hash curto e determinístico (FNV-1a). Não é segurança: é só uma impressão
// digital para comparar "a cotação de antes" com "a de agora".
export function fingerprint(value: unknown): string {
  let hash = 2166136261
  for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}

// A cotação do carrinho do usuário AGORA: os mesmos números do carrinho, mais
// uma impressão digital de tudo o que afeta o valor pago.
export function buildQuote(userId: string): Quote {
  const cart = toCartResponse(getOrCreateCart({ kind: 'user', userId }))
  const payable = cart.items.filter((item) => !item.issues.includes('sold_out'))
  const blocked = cart.items.length === 0 || cart.items.some((item) => item.issues.includes('sold_out') || item.issues.includes('insufficient_stock'))
  const id = `q-${fingerprint({
    items: payable.map((item) => [item.nftId, item.editionId, item.quantity, item.unitPrice, item.maxQuantity]),
    summary: cart.summary,
  })}`
  return { id, items: payable, summary: cart.summary, blocked }
}

// O que o front recebe (sem os campos internos do mock).
export function toOrderResponse(order: DbOrder): Order {
  const { userId: _userId, quoteId: _quoteId, settleAt: _settleAt, outcome: _outcome, ...publicOrder } = order
  return publicOrder
}

export function createOrder(userId: string, input: CreateOrderInput, quote: Quote): DbOrder {
  const { scenarios } = readDb()
  const now = Date.now()
  const order: DbOrder = {
    id: `ord-${randomToken(6)}`,
    status: 'pending',
    version: 1,
    createdAt: new Date(now).toISOString(),
    settledAt: null,
    declineReason: null,
    // SNAPSHOT: copia tudo o que o recibo precisa. Mudanças futuras no
    // catálogo (preço, nome, imagem) não mexem neste pedido.
    items: quote.items.map((item) => ({
      nftId: item.nftId,
      editionId: item.editionId,
      name: item.name,
      tokenId: item.tokenId,
      editionLabel: item.editionLabel,
      image: { alt: item.image.alt, small: item.image.small },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    summary: {
      subtotal: quote.summary.subtotal,
      discount: quote.summary.discount,
      networkFee: quote.summary.networkFee,
      total: quote.summary.total,
      couponCode: quote.summary.coupon?.code ?? null,
    },
    wallet: { ...input.wallet, providerLabel: WALLET_PROVIDER_LABELS[input.wallet.provider] },
    buyer: { displayName: input.buyer.displayName, email: input.buyer.email },
    transaction: null,
    userId,
    quoteId: quote.id,
    settleAt: new Date(now + SETTLE_DELAY_MS).toISOString(),
    outcome: scenarios.payment === 'decline' ? 'declined' : 'confirmed',
  }
  writeDb((db) => {
    db.orders.push(order)
  })
  return order
}

// A "rede" decide o pedido quando chega a hora (a cada leitura dele).
// Pendente → confirmado ou recusado, e daí não muda mais (estado TERMINAL).
// Devolve true se mudou agora (o Socket.IO vai usar isso para emitir order.updated).
export function settleIfDue(orderId: string): boolean {
  const order = readDb().orders.find((item) => item.id === orderId)
  if (!order || order.status !== 'pending' || Date.parse(order.settleAt) > Date.now()) return false

  writeDb((db) => {
    const target = db.orders.find((item) => item.id === orderId)!
    target.status = target.outcome
    target.version += 1
    target.settledAt = new Date().toISOString()

    if (target.outcome === 'declined') {
      // Recusa: nada sai do carrinho nem do estoque (README: "preservar os itens em falhas").
      target.declineReason = 'A carteira recusou o pagamento. Nenhum valor foi cobrado.'
      return
    }

    const hash = `0x${randomToken(32)}`
    target.transaction = { hash, explorerUrl: `https://etherscan.io/tx/${hash}` }

    for (const item of target.items) {
      // Baixa o estoque da edição comprada (o NFT muda de versão: o
      // nft.updated do Socket.IO avisa as outras telas).
      const nft = db.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (nft && edition) {
        if (edition.available !== null) edition.available = Math.max(0, edition.available - item.quantity)
        nft.version += 1
      }
    }

    // Tira do carrinho SÓ o que foi comprado, e só a quantidade comprada.
    // Se a pessoa adicionou mais unidades depois de pagar, elas ficam.
    const cart = db.carts[`user:${target.userId}`]
    if (cart) {
      for (const bought of target.items) {
        const line = cart.items.find((entry) => entry.nftId === bought.nftId && entry.editionId === bought.editionId)
        if (line) line.quantity -= bought.quantity
      }
      cart.items = cart.items.filter((entry) => entry.quantity > 0)
      cart.couponCode = null
      cart.version += 1
    }
  })
  return true
}
