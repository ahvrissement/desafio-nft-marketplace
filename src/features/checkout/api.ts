import {
  connectWalletResponseSchema,
  orderSchema,
  quoteSchema,
  walletsResponseSchema,
  type CreateOrderInput,
  type WalletProvider,
} from '@/contracts/checkout'
import { request } from '@/lib/http'

export const fetchQuote = (signal?: AbortSignal) => request(quoteSchema, { url: '/checkout/quote', signal })

export async function fetchWallets(signal?: AbortSignal) {
  const { items } = await request(walletsResponseSchema, { url: '/me/wallets', signal })
  return items
}

export const connectWallet = (input: { provider: WalletProvider; address: string }) =>
  request(connectWalletResponseSchema, { method: 'POST', url: '/wallet/connect', data: input })

export const createOrder = (input: CreateOrderInput, idempotencyKey: string) =>
  request(orderSchema, { method: 'POST', url: '/orders', data: input, headers: { 'Idempotency-Key': idempotencyKey } })

export const fetchOrder = (orderId: string, signal?: AbortSignal) =>
  request(orderSchema, { url: `/orders/${encodeURIComponent(orderId)}`, signal })
