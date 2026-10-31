import { z } from 'zod'

import { buyerSchema, paymentWalletSchema, type CreateOrderInput, type Wallet } from '@/contracts/checkout'
import type { User } from '@/contracts/auth'

// O formulário do checkout = dados do colecionador + carteira de pagamento.
// Reaproveita os schemas do contrato: a validação da tela é a mesma da API.
export const checkoutFormSchema = buyerSchema.extend(paymentWalletSchema.shape)
export type CheckoutForm = z.input<typeof checkoutFormSchema>

const usernameFrom = (email: string) =>
  email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20)
    .padEnd(3, '0')

// Já vem preenchido com a conta e a carteira principal: a pessoa só revisa.
export function defaultCheckoutValues(user: User, wallet: Wallet | undefined): CheckoutForm {
  const username = usernameFrom(user.email)
  return {
    displayName: user.name,
    username,
    email: user.email,
    profileName: user.name,
    ensName: wallet?.ens ?? `${username}.eth`,
    referralCode: '',
    note: '',
    walletId: wallet?.id ?? null,
    provider: wallet?.provider ?? 'metamask',
    network: wallet?.network ?? 'ethereum',
    address: wallet?.address ?? '',
    secondary: '',
  }
}

export function toOrderInput(values: z.output<typeof checkoutFormSchema>, quoteId: string): CreateOrderInput {
  const { walletId, provider, network, address, secondary, ...buyer } = values
  return {
    quoteId,
    buyer: { ...buyer, referralCode: buyer.referralCode || undefined, note: buyer.note || undefined },
    wallet: { walletId, provider, network, address, secondary: secondary || undefined },
  }
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
