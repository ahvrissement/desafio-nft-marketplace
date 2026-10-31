import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { BackButton } from '@/components/back-button'
import { SelectField, TextAreaField, TextField } from '@/components/form-fields'
import type { User } from '@/contracts/auth'
import { WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type Quote, type Wallet } from '@/contracts/checkout'
import { NETWORK_LABELS, NETWORKS } from '@/contracts/nft'
import { useAuthDialog } from '@/features/auth/use-auth-dialog'
import { useSession } from '@/features/auth/use-session'
import { formatEth } from '@/lib/money'

import { readAttempt } from '../attempt'
import { readDraft, saveDraft } from '../draft'
import { checkoutFormSchema, defaultCheckoutValues, toOrderInput, type CheckoutForm } from '../form'
import { checkoutQueries } from '../queries'
import { usePlaceOrder } from '../use-place-order'
import { useWalletConnection } from '../use-wallet-connection'
import { OrderSummary } from './order-summary'
import { ReviewDialog } from './review-dialog'
import { WalletSection } from './wallet-section'

export function CheckoutPage() {
  const { user, isPending } = useSession()
  if (isPending) return <CheckoutSkeleton />
  // A rota é protegida (beforeLoad), mas a sessão pode expirar AQUI DENTRO.
  if (!user) return <SessionExpired />
  return <CheckoutLoader user={user} />
}

// O que foi preenchido está no rascunho: depois de entrar, volta tudo.
function SessionExpired() {
  const dialog = useAuthDialog()
  return (
    <div role="alert" className="page-container flex flex-col items-start gap-4 py-16">
      <title>Pagamento | Kurio</title>
      <h1 className="text-2xl font-bold">Sua sessão expirou</h1>
      <p className="max-w-xl text-text-secondary">
        Entre de novo para concluir a compra. Seu carrinho e o que você preencheu no pagamento foram guardados.
      </p>
      <button type="button" onClick={() => dialog.open('entrar', '/checkout')} className="rounded-[5px] bg-primary px-6 py-3 font-bold text-ink">
        Entrar e continuar
      </button>
    </div>
  )
}

function CheckoutLoader({ user }: { user: User }) {
  const wallets = useQuery(checkoutQueries.wallets(user.id))
  const quote = useQuery(checkoutQueries.quote(user.id))

  if (wallets.isError || quote.isError) {
    return (
      <div role="alert" className="page-container flex flex-col items-start gap-4 py-16">
        <h1 className="text-2xl font-bold">Não foi possível carregar o pagamento</h1>
        <button
          type="button"
          onClick={() => {
            void wallets.refetch()
            void quote.refetch()
          }}
          className="rounded-[5px] bg-primary px-6 py-3 font-bold text-ink"
        >
          Tentar de novo
        </button>
      </div>
    )
  }
  if (wallets.isPending || quote.isPending) return <CheckoutSkeleton />
  if (quote.data.items.length === 0) return <EmptyCheckout />

  // O formulário só monta com as carteiras carregadas: os valores iniciais
  // já vêm com a carteira principal, sem "piscar" vazio.
  return <CheckoutContent user={user} wallets={wallets.data} quote={quote.data} onRefetchQuote={() => void quote.refetch()} />
}

interface CheckoutContentProps {
  user: User
  wallets: Wallet[]
  quote: Quote
  onRefetchQuote: () => void
}

function CheckoutContent({ user, wallets, quote, onRefetchQuote }: CheckoutContentProps) {
  const primary = wallets.find((wallet) => wallet.kind === 'primary') ?? wallets[0]
  // Começa pelo rascunho (se houver, e se for desta pessoa); senão, pela conta.
  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { ...defaultCheckoutValues(user, primary), ...readDraft(user.id) },
  })
  // Cada alteração vai para o rascunho. useWatch (sem `name`) observa o
  // formulário inteiro; o efeito grava quando os valores mudam.
  const draft = useWatch({ control: form.control })
  useEffect(() => saveDraft(user.id, draft), [draft, user.id])
  const { errors } = form.formState
  const wallet = useWalletConnection()
  const [reviewing, setReviewing] = useState(false)
  // useWatch (e não form.watch): re-renderiza só quando ESTE campo muda.
  const useOtherWallet = useWatch({ control: form.control, name: 'walletId' }) === null

  // Compra que ficou no meio (aba recarregou durante o envio): retomar com a
  // MESMA chave devolve o pedido existente, sem criar outro.
  const [pendingAttempt] = useState(readAttempt)
  const resume = usePlaceOrder()

  const toggleOtherWallet = (checked: boolean) => {
    wallet.disconnect()
    if (checked) {
      form.setValue('walletId', null)
      form.setValue('address', '')
    } else if (primary) {
      form.setValue('walletId', primary.id)
      form.setValue('provider', primary.provider)
      form.setValue('network', primary.network)
      form.setValue('address', primary.address, { shouldValidate: true })
    }
  }

  const submitButton = (className: string) => (
    <button type="submit" disabled={quote.blocked} className={className}>
      Confirmar compra
    </button>
  )

  return (
    <div className="page-container pb-12 lg:pt-8">
      <title>Pagamento | Kurio</title>
      <nav aria-label="Trilha de navegação" className="mb-8 hidden lg:block">
        <ol className="flex gap-2 text-[15px] leading-4 font-medium">
          <li>
            <Link to="/" className="hover:text-text-accent">Início</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link to="/" hash="mercado" activeOptions={{ includeHash: true }} className="hover:text-text-accent">Mercado</Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>

      <div className="relative flex items-center justify-center pt-6 pb-6 lg:hidden">
        <BackButton className="absolute left-0" />
        <h1 className="text-lg font-bold">Pagamento com carteira</h1>
      </div>
      <h1 className="sr-only max-lg:hidden">Pagamento</h1>

      {pendingAttempt && (
        <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-primary bg-primary/10 p-4 text-sm">
          <span>Você tinha uma compra em andamento nesta aba.</span>
          <button
            type="button"
            disabled={resume.isPending}
            onClick={() => resume.mutate(pendingAttempt)}
            className="font-bold text-text-accent underline underline-offset-4"
          >
            {resume.isPending ? 'Retomando…' : 'Retomar compra'}
          </button>
          {resume.error && <span className="text-destructive">{resume.error.message}</span>}
        </div>
      )}

      {quote.blocked && (
        <p role="alert" className="mb-6 rounded-md border border-destructive p-4 text-sm">
          Algum item esgotou ou está acima do estoque.{' '}
          <Link to="/cart" className="font-bold text-text-accent underline">Ajuste o carrinho</Link> para continuar.
        </p>
      )}

      <form
        noValidate
        // Formulário válido → abre a revisão. Inválido → foco no 1º erro (RHF).
        onSubmit={form.handleSubmit(() => setReviewing(true))}
        className="grid gap-10 lg:grid-cols-[763px_1fr] lg:gap-8"
      >
        {/* ---------- Dados do colecionador ---------- */}
        <section aria-labelledby="perfil-titulo" className="order-2 lg:order-none">
          <h2 id="perfil-titulo" className="mb-4 text-lg font-bold">Perfil do colecionador</h2>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <TextField label="Nome de exibição" required autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
            <TextField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...form.register('username')} />
            <SelectField label="Rede" required error={errors.network?.message} {...form.register('network')}>
              {NETWORKS.map((network) => (
                <option key={network} value={network}>{NETWORK_LABELS[network]}</option>
              ))}
            </SelectField>
            <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
            <TextField
              label="Endereço da carteira"
              required
              readOnly={!useOtherWallet}
              placeholder="Endereço 0x da carteira"
              spellCheck={false}
              hint={useOtherWallet ? undefined : 'Vem da carteira cadastrada escolhida.'}
              error={errors.address?.message}
              {...form.register('address', { onChange: wallet.disconnect })}
            />
            <TextField label="ENS ou carteira secundária (opcional)" placeholder="ENS ou carteira secundária" error={errors.secondary?.message} {...form.register('secondary')} />
            <SelectField label="Tipo de carteira" required error={errors.provider?.message} {...form.register('provider', { onChange: wallet.disconnect })}>
              {WALLET_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>{WALLET_PROVIDER_LABELS[provider]}</option>
              ))}
            </SelectField>
            <TextField label="Código de indicação (opcional)" error={errors.referralCode?.message} {...form.register('referralCode')} />
            <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
            <TextField label="Nome ENS" required placeholder="nome.eth" spellCheck={false} error={errors.ensName?.message} {...form.register('ensName')} />
          </div>

          <label className="mt-6 flex w-fit cursor-pointer items-center gap-2 text-[15px]">
            <input type="checkbox" checked={useOtherWallet} onChange={(event) => toggleOtherWallet(event.target.checked)} className="size-4 accent-primary" />
            Usar outra carteira?
          </label>

          <TextAreaField label="Observação do colecionador (opcional)" className="mt-6 lg:w-[350px]" error={errors.note?.message} {...form.register('note')} />
          {submitButton('mt-8 h-15 w-full rounded-full bg-linear-to-r from-primary to-[#b07440] text-base font-bold text-ink disabled:opacity-50 lg:hidden')}
        </section>

        {/* ---------- Seus NFTs + carteira ---------- */}
        <aside aria-label="Resumo e carteira" className="order-1 flex flex-col gap-8 lg:order-none">
          <section aria-labelledby="nfts-titulo">
            <h2 id="nfts-titulo" className="mb-2 text-lg font-bold">Seus NFTs</h2>
            <OrderSummary quote={quote} />
          </section>
          <WalletSection form={form} wallets={wallets} wallet={wallet} />
          <p className="flex justify-between text-lg font-bold lg:hidden">
            Total: <span className="text-text-accent">{formatEth(quote.summary.total)}</span>
          </p>
          {submitButton('hidden h-11.25 w-full rounded-[4px] bg-primary text-base font-bold text-ink hover:bg-text-accent disabled:opacity-50 lg:block')}
        </aside>
      </form>

      {reviewing && (
        <ReviewDialog
          open
          onOpenChange={setReviewing}
          latestQuote={quote}
          buildInput={(quoteId) => toOrderInput(checkoutFormSchema.parse(form.getValues()), quoteId)}
          wallet={wallet}
          onQuoteRejected={onRefetchQuote}
        />
      )}
    </div>
  )
}

function EmptyCheckout() {
  return (
    <div className="page-container flex flex-col items-center gap-4 py-16 text-center">
      <title>Pagamento | Kurio</title>
      <h1 className="text-xl font-bold">Seu carrinho está vazio</h1>
      <Link to="/" hash="mercado" className="rounded-[5px] bg-primary px-6 py-3 font-bold text-ink">
        Explorar o mercado
      </Link>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" className="page-container grid gap-10 pt-16 lg:grid-cols-[763px_1fr] lg:gap-8">
      <span role="status" className="sr-only">Carregando pagamento…</span>
      <div aria-hidden className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="h-17 rounded-sm skeleton-shimmer" />
        ))}
      </div>
      <div aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-17.5 skeleton-shimmer" />
        ))}
        <div className="h-40 rounded-sm skeleton-shimmer" />
      </div>
    </div>
  )
}
