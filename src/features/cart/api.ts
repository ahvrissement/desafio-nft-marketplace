import type { AxiosRequestConfig } from 'axios'

import {
  cartSchema,
  mergeCartResponseSchema,
  type AddCartItemInput,
  type ApplyCouponInput,
  type UpdateCartItemInput,
} from '@/contracts/cart'
import { getToken } from '@/features/auth/token-store'
import { request } from '@/lib/http'

import { getGuestCartId } from './guest-cart'

// Logado: o token (posto pelo interceptor) identifica o carrinho.
// Visitante: o header X-Cart-Id.
function cartRequest(config: AxiosRequestConfig) {
  const headers = getToken() ? {} : { 'X-Cart-Id': getGuestCartId({ create: true }) ?? '' }
  return request(cartSchema, { ...config, headers: { ...config.headers, ...headers } })
}

export const fetchCart = (signal?: AbortSignal) => cartRequest({ url: '/cart', signal })
export const addCartItem = (input: AddCartItemInput) => cartRequest({ method: 'POST', url: '/cart/items', data: input })
export const updateCartItem = (itemId: string, input: UpdateCartItemInput) =>
  cartRequest({ method: 'PATCH', url: `/cart/items/${encodeURIComponent(itemId)}`, data: input })
export const removeCartItem = (itemId: string) => cartRequest({ method: 'DELETE', url: `/cart/items/${encodeURIComponent(itemId)}` })
export const applyCoupon = (input: ApplyCouponInput) => cartRequest({ method: 'PUT', url: '/cart/coupon', data: input })
export const removeCoupon = () => cartRequest({ method: 'DELETE', url: '/cart/coupon' })

export function mergeGuestCart(guestCartId: string) {
  return request(mergeCartResponseSchema, { method: 'POST', url: '/cart/merge', data: { guestCartId } })
}
