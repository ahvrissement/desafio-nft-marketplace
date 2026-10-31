import { z } from 'zod'

import { ethAmountSchema } from './common'
import { MAX_QUANTITY_PER_ORDER, networkSchema, nftImageSchema } from './nft'

// ---------------------------------------------------------------------------
// Carrinho
//
// Quem calcula É A API: preço atual, subtotal, desconto, taxa e total. O front
// só exibe. Assim não existem duas regras de negócio (uma no front, outra no
// back) que podem discordar, e o checkout usa os mesmos números que o carrinho.
// ---------------------------------------------------------------------------

// Problemas de um item, detectados pela API a cada leitura do carrinho:
//   price_changed       o preço mudou desde que o item foi adicionado
//   insufficient_stock  o estoque caiu abaixo da quantidade escolhida
//   sold_out            a edição esgotou (o item não entra no total)
export const CART_ITEM_ISSUES = ['price_changed', 'insufficient_stock', 'sold_out'] as const
export const cartItemIssueSchema = z.enum(CART_ITEM_ISSUES)
export type CartItemIssue = z.infer<typeof cartItemIssueSchema>

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  editionLabel: z.string(),
  network: networkSchema,
  image: nftImageSchema,
  quantity: z.number().int().positive(),
  maxQuantity: z.number().int().nonnegative(), // quanto cabe AGORA (estoque e limite por pedido)
  unitPrice: ethAmountSchema, // preço atual
  previousUnitPrice: ethAmountSchema.nullable(), // preço quando foi adicionado, se mudou
  lineTotal: ethAmountSchema,
  issues: z.array(cartItemIssueSchema),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const appliedCouponSchema = z.object({
  code: z.string(),
  label: z.string(),
  discountBps: z.number().int().positive(),
})

export const cartSummarySchema = z.object({
  itemCount: z.number().int().nonnegative(), // soma das quantidades (o número do ícone)
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  coupon: appliedCouponSchema.nullable(),
})
export type CartSummary = z.infer<typeof cartSummarySchema>

export const cartSchema = z.object({
  id: z.string(),
  // Sobe a cada alteração. Com cliques rápidos, uma resposta antiga que chega
  // atrasada (versão menor) é descartada no front: o carrinho não "volta no tempo".
  version: z.number().int().nonnegative(),
  items: z.array(cartItemSchema),
  summary: cartSummarySchema,
})
export type Cart = z.infer<typeof cartSchema>

const quantitySchema = z
  .number()
  .int()
  .min(1, 'A quantidade mínima é 1.')
  .max(MAX_QUANTITY_PER_ORDER, `O limite é de ${MAX_QUANTITY_PER_ORDER} unidades por pedido.`)

// POST /api/cart/items
export const addCartItemInputSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: quantitySchema,
})
export type AddCartItemInput = z.infer<typeof addCartItemInputSchema>

// PATCH /api/cart/items/:itemId. acknowledgePrice: "vi que o preço mudou".
export const updateCartItemInputSchema = z
  .object({ quantity: quantitySchema.optional(), acknowledgePrice: z.literal(true).optional() })
  .refine((value) => value.quantity !== undefined || value.acknowledgePrice, 'Nada para alterar.')
export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>

// PUT /api/cart/coupon
export const applyCouponInputSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Digite o código promocional.'),
})
export type ApplyCouponInput = z.input<typeof applyCouponInputSchema>

// POST /api/cart/merge: junta o carrinho do visitante ao da conta, no login.
export const mergeCartInputSchema = z.object({ guestCartId: z.string().min(8) })
export const mergeCartResponseSchema = z.object({ cart: cartSchema, mergedItems: z.number().int().nonnegative() })
