import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { SelectField, TextField } from '@/components/form-fields'
import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type Wallet } from '@/contracts/checkout'
import { NETWORK_LABELS, NETWORKS } from '@/contracts/nft'
import { walletInputSchema, type WalletInput } from '@/contracts/profile'
import { applyServerErrors } from '@/features/auth/server-errors'
import { useSession } from '@/features/auth/use-session'
import { checkoutQueries } from '@/features/checkout/queries'
import { shortAddress } from '@/features/checkout/form'

import { saveWallet } from '../api'

// "Carteiras": principal e secundária, cadastrar e editar (README).
// As mesmas carteiras aparecem no pagamento (mesma query de checkoutQueries).
export function WalletsPage() {
  const { user, isPending } = useSession()
  if (!isPending && !user) return <Navigate to="/" replace />
  if (!user) return null
  return <WalletsLoader userId={user.id} />
}

function WalletsLoader({ userId }: { userId: string }) {
  const { data: wallets, isPending, isError, refetch } = useQuery(checkoutQueries.wallets(userId))
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>Não foi possível carregar suas carteiras.</p>
        <button type="button" onClick={() => void refetch()} className="font-bold text-text-accent underline">Tentar de novo</button>
      </div>
    )
  }
  if (isPending) return <div aria-busy="true" className="h-120 rounded-sm skeleton-shimmer" />
  const primary = wallets.find((wallet) => wallet.kind === 'primary')
  const secondary = wallets.find((wallet) => wallet.kind === 'secondary')
  return (
    <>
      <title>Carteiras | Kurio</title>
      <h1 className="sr-only">Carteiras</h1>
      <WalletSection userId={userId} kind="primary" title="Carteira principal" wallet={primary} />
      <WalletSection userId={userId} kind="secondary" title="Carteira secundária" wallet={secondary} copyFrom={primary} />
    </>
  )
}

interface WalletSectionProps {
  userId: string
  kind: 'primary' | 'secondary'
  title: string
  wallet: Wallet | undefined
  copyFrom?: Wallet // "Igual à carteira principal"
}

function WalletSection({ userId, kind, title, wallet, copyFrom }: WalletSectionProps) {
  // Sem carteira: começa fechado ("Adicionar"). Com carteira: mostra o resumo e "Editar".
  const [editing, setEditing] = useState(false)
  const headingId = `carteira-${kind}`
  return (
    <section aria-labelledby={headingId} className="mb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={headingId} className="text-lg font-bold">{title}</h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="font-bold text-text-accent hover:underline">
            {wallet ? 'Editar' : 'Adicionar'}
          </button>
        )}
      </div>
      <p className="mt-1 text-[13px] text-text-secondary">
        {kind === 'primary'
          ? 'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'
          : wallet
            ? ''
            : 'Você ainda não adicionou uma carteira secundária.'}
      </p>

      {wallet && !editing && (
        <dl className="mt-4 grid max-w-xl grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
          <dt className="text-text-secondary">Apelido</dt>
          <dd>{wallet.label}</dd>
          <dt className="text-text-secondary">Tipo</dt>
          <dd>{WALLET_PROVIDER_LABELS[wallet.provider]}</dd>
          <dt className="text-text-secondary">Rede</dt>
          <dd>{NETWORK_LABELS[wallet.network]}</dd>
          <dt className="text-text-secondary">Endereço</dt>
          <dd translate="no">{shortAddress(wallet.address)}</dd>
          {wallet.ens && (
            <>
              <dt className="text-text-secondary">ENS</dt>
              <dd>{wallet.ens}</dd>
            </>
          )}
        </dl>
      )}
      {editing && <WalletForm userId={userId} kind={kind} wallet={wallet} copyFrom={copyFrom} onDone={() => setEditing(false)} />}
    </section>
  )
}

function WalletForm({ userId, kind, wallet, copyFrom, onDone }: Omit<WalletSectionProps, 'title'> & { onDone: () => void }) {
  const queryClient = useQueryClient()
  const form = useForm<WalletInput>({
    resolver: zodResolver(walletInputSchema),
    defaultValues: {
      kind,
      label: wallet?.label ?? (kind === 'primary' ? 'Principal' : 'Reserva'),
      provider: wallet?.provider ?? 'metamask',
      network: wallet?.network ?? 'ethereum',
      address: wallet?.address ?? '',
      ens: wallet?.ens ?? '',
    },
  })
  const { errors } = form.formState
  const save = useMutation({
    mutationFn: (input: WalletInput) => saveWallet(input, wallet?.id),
    onSuccess: (wallets) => {
      queryClient.setQueryData(checkoutQueries.wallets(userId).queryKey, wallets)
      toast.success(wallet ? 'Carteira atualizada.' : 'Carteira adicionada.')
      onDone()
    },
    onError: (error) => applyServerErrors(error, form.setError, ['label', 'provider', 'network', 'address', 'ens']),
  })

  const sameAsPrimary = (checked: boolean) => {
    if (!checked || !copyFrom) return
    form.setValue('provider', copyFrom.provider)
    form.setValue('network', copyFrom.network)
  }

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="mt-6 grid gap-x-7 gap-y-5 md:grid-cols-2">
      {copyFrom && (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" onChange={(event) => sameAsPrimary(event.target.checked)} className="size-4 accent-primary" />
          Igual à carteira principal (tipo e rede)
        </label>
      )}
      <TextField label="Apelido da carteira" required error={errors.label?.message} {...form.register('label')} />
      <SelectField label="Rede" required error={errors.network?.message} {...form.register('network')}>
        {NETWORKS.map((network) => (
          <option key={network} value={network}>{NETWORK_LABELS[network]}</option>
        ))}
      </SelectField>
      <TextField label="Endereço da carteira" required placeholder="Endereço 0x da carteira" spellCheck={false} error={errors.address?.message} {...form.register('address')} />
      <TextField label="ENS (opcional)" placeholder="nome.eth" spellCheck={false} error={errors.ens?.message} {...form.register('ens')} />
      <SelectField label="Tipo de carteira" required error={errors.provider?.message} {...form.register('provider')}>
        {WALLET_PROVIDERS.map((provider) => (
          <option key={provider} value={provider}>{WALLET_PROVIDER_LABELS[provider]}</option>
        ))}
      </SelectField>
      {errors.root?.server && <p role="alert" className="text-sm text-destructive md:col-span-2">{errors.root.server.message}</p>}
      <div className="flex gap-3 md:col-span-2">
        <button type="submit" disabled={save.isPending} className="h-10 rounded-[4px] bg-primary px-4 font-bold text-ink disabled:opacity-50">
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-[4px] border border-border px-4 font-bold">Cancelar</button>
      </div>
    </form>
  )
}
