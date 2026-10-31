import { z } from 'zod'

import { cartItemSchema, cartSummarySchema } from './cart'
import { ethAmountSchema } from './common'
import { networkSchema } from './nft'

// ---------------------------------------------------------------------------
// Carteiras
// ---------------------------------------------------------------------------

export const WALLET_PROVIDERS = ['walletconnect', 'metamask', 'coinbase'] as const
export const walletProviderSchema = z.enum(WALLET_PROVIDERS)
export type WalletProvider = z.infer<typeof walletProviderSchema>
export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  walletconnect: 'WalletConnect',
  metamask: 'MetaMask',
  coinbase: 'Coinbase Wallet',
}

export const walletAddressSchema = z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/, 'Use um endereço 0x com 40 caracteres hexadecimais.')
export const ensNameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/, 'Use um nome ENS terminado em .eth.')

// Carteira cadastrada (principal ou secundária, como no Figma mobile).
export const walletSchema = z.object({
  id: z.string(),
  kind: z.enum(['primary', 'secondary']),
  label: z.string(), // "Principal", "Reserva"
  provider: walletProviderSchema,
  network: networkSchema,
  address: walletAddressSchema,
  ens: z.string().nullable(),
})
export type Wallet = z.infer<typeof walletSchema>
export const walletsResponseSchema = z.object({ items: z.array(walletSchema) })

// POST /api/wallet/connect: simulação do "pedir permissão à extensão da carteira"
export const connectWalletInputSchema = z.object({ provider: walletProviderSchema, address: walletAddressSchema })
export const connectWalletResponseSchema = z.object({ provider: walletProviderSchema, address: walletAddressSchema, connectedAt: z.iso.datetime() })
export type ConnectedWallet = z.infer<typeof connectWalletResponseSchema>

// ---------------------------------------------------------------------------
// Cotação: os valores que a API garante AGORA
// ---------------------------------------------------------------------------

export const quoteSchema = z.object({
  // "Impressão digital" de itens, preços, estoque, cupom e taxas. Se qualquer
  // coisa mudar, o id muda, e o pedido com o id antigo é recusado (QUOTE_CHANGED).
  id: z.string(),
  items: z.array(cartItemSchema),
  summary: cartSummarySchema,
  // Algum item esgotou ou está acima do estoque: não dá para pagar.
  blocked: z.boolean(),
})
export type Quote = z.infer<typeof quoteSchema>

// ---------------------------------------------------------------------------
// Pedido
// ---------------------------------------------------------------------------

// Campos do formulário "Perfil do colecionador" do Figma.
export const buyerSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40),
  username: z.string().trim().regex(/^[a-z0-9_.]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou _.'),
  email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.')),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.').max(40),
  ensName: ensNameSchema,
  referralCode: z
    .string()
    .trim()
    .regex(/^$|^[A-Z0-9-]{4,16}$/i, 'Use de 4 a 16 letras, números ou hífen.')
    .optional(),
  note: z.string().trim().max(280, 'Use no máximo 280 caracteres.').optional(),
})
export type Buyer = z.infer<typeof buyerSchema>

export const paymentWalletSchema = z.object({
  provider: walletProviderSchema,
  network: networkSchema,
  address: walletAddressSchema,
  secondary: z.string().trim().max(80).optional(), // "ENS ou carteira secundária (opcional)"
  walletId: z.string().nullable(), // carteira cadastrada usada (ou null = "usar outra carteira")
})
export type PaymentWallet = z.infer<typeof paymentWalletSchema>

// POST /api/orders (header Idempotency-Key obrigatório)
export const createOrderInputSchema = z.object({ quoteId: z.string(), buyer: buyerSchema, wallet: paymentWalletSchema })
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export const orderStatusSchema = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatusSchema>

// O recibo é um SNAPSHOT: copia nome, imagem, preço e totais no momento da
// compra. Uma mudança de preço depois não altera o que foi pago.
export const orderItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  image: z.object({ alt: z.string(), small: z.string() }),
  quantity: z.number().int().positive(),
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
})

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  // Sobe a cada mudança de status: o order.updated do Socket.IO usa isto
  // para descartar eventos repetidos ou atrasados.
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  settledAt: z.iso.datetime().nullable(),
  declineReason: z.string().nullable(),
  items: z.array(orderItemSchema),
  summary: z.object({
    subtotal: ethAmountSchema,
    discount: ethAmountSchema,
    networkFee: ethAmountSchema,
    total: ethAmountSchema,
    couponCode: z.string().nullable(),
  }),
  wallet: paymentWalletSchema.extend({ providerLabel: z.string() }),
  buyer: buyerSchema.pick({ displayName: true, email: true }),
  transaction: z.object({ hash: z.string(), explorerUrl: z.url() }).nullable(), // só depois de confirmado
})
export type Order = z.infer<typeof orderSchema>
