import { useWatch, type UseFormReturn } from 'react-hook-form'

import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type Wallet } from '@/contracts/checkout'
import { NETWORK_LABELS } from '@/contracts/nft'
import { cn } from '@/lib/utils'

import { shortAddress, type CheckoutForm } from '../form'
import type { WalletConnection } from '../use-wallet-connection'

const optionClass =
  'flex cursor-pointer items-center gap-3 rounded-[14px] border border-transparent bg-card px-4 py-3 has-checked:border-primary has-focus-visible:outline-2 has-focus-visible:outline-ring lg:rounded-none lg:border-border lg:bg-transparent'

const PROVIDER_INITIAL = { walletconnect: 'W', metamask: 'M', coinbase: 'C' } as const

interface WalletSectionProps {
  form: UseFormReturn<CheckoutForm>
  wallets: Wallet[]
  wallet: WalletConnection
}

// "Carteira conectada" (carteiras cadastradas) + "Carteira e rede" (provedor),
// com a simulação de conexão, recusa e desconexão que o README pede.
export function WalletSection({ form, wallets, wallet: { connection, connect, disconnect } }: WalletSectionProps) {
  const [walletId, provider, address] = useWatch({ control: form.control, name: ['walletId', 'provider', 'address'] })

  // Trocar de carteira ou de provedor desconecta a anterior.
  const chooseWallet = (wallet: Wallet) => {
    form.setValue('walletId', wallet.id)
    form.setValue('provider', wallet.provider)
    form.setValue('network', wallet.network)
    form.setValue('address', wallet.address, { shouldValidate: true })
    disconnect()
  }

  return (
    <div className="flex flex-col gap-6">
      {wallets.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-base font-bold">Carteira cadastrada</legend>
          {wallets.map((wallet) => (
            <label key={wallet.id} className={optionClass}>
              <input
                type="radio"
                name="saved-wallet"
                checked={walletId === wallet.id}
                onChange={() => chooseWallet(wallet)}
                className="size-4 accent-primary"
              />
              <span className="flex flex-col text-sm leading-5">
                <strong className="text-base">{wallet.label}</strong>
                <span className="text-text-secondary">{wallet.ens ?? shortAddress(wallet.address)}</span>
                <span className="text-text-secondary">Rede {NETWORK_LABELS[wallet.network]}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-base font-bold lg:mx-auto">Carteira e rede</legend>
        {WALLET_PROVIDERS.map((option) => (
          <label key={option} className={optionClass}>
            <input
              type="radio"
              value={option}
              {...form.register('provider', {
                onChange: disconnect,
              })}
              className="size-4 accent-primary"
            />
            <span aria-hidden className="grid size-10 place-items-center rounded-full border border-border text-sm font-bold text-text-accent lg:hidden">
              {PROVIDER_INITIAL[option]}
            </span>
            <span className="text-[15px]">{WALLET_PROVIDER_LABELS[option]}</span>
          </label>
        ))}
      </fieldset>

      {/* Status da conexão: aria-live anuncia "conectada", "recusou" etc. */}
      <div aria-live="polite" className="flex flex-col gap-2 text-sm">
        {connection ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <span aria-hidden className="mr-1 inline-block size-2 rounded-full bg-emerald-400" />
              {WALLET_PROVIDER_LABELS[connection.provider]} conectada · {shortAddress(connection.address)}
            </span>
            <button type="button" onClick={disconnect} className="font-bold text-text-accent underline underline-offset-4">
              Desconectar
            </button>
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-text-secondary">Carteira não conectada.</span>
            <button
              type="button"
              disabled={connect.isPending || !address}
              onClick={() => connect.mutate({ provider, address })}
              className={cn('font-bold text-text-accent underline underline-offset-4', connect.isPending && 'cursor-wait no-underline')}
            >
              {connect.isPending ? `Aguardando ${WALLET_PROVIDER_LABELS[provider]}…` : 'Conectar agora'}
            </button>
          </div>
        )}
        {connect.error && <p className="text-destructive">{connect.error.message}</p>}
      </div>
    </div>
  )
}
