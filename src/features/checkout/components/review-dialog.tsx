import { useRef, useState } from 'react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { WALLET_PROVIDER_LABELS, type CreateOrderInput, type Quote } from '@/contracts/checkout'
import { NETWORK_LABELS } from '@/contracts/nft'
import type { ApiError } from '@/lib/http'
import { formatEth } from '@/lib/money'

import { clearAttempt, startAttempt } from '../attempt'
import { shortAddress } from '../form'
import { usePlaceOrder } from '../use-place-order'
import type { WalletConnection } from '../use-wallet-connection'
import { OrderSummary } from './order-summary'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // A cotação MAIS RECENTE da API (pode mudar com o diálogo aberto)
  latestQuote: Quote
  // Monta o pedido para uma cotação (o formulário já foi validado)
  buildInput: (quoteId: string) => CreateOrderInput
  wallet: WalletConnection
  onQuoteRejected: () => void
}

// O pai só monta este componente quando o diálogo abre: assim o useState
// abaixo "fotografa" a cotação no momento da abertura.
//
// "Revise seu pedido": a última parada antes de pagar (README: "permitir
// revisão antes do envio" e "mudanças devem exigir nova confirmação").
//
// O diálogo mostra a cotação que a pessoa VIU ao abrir (reviewed). Se a API
// trouxer outra (preço subiu, edição esgotou), aparece o aviso, os valores
// novos substituem os antigos só quando a pessoa aceita, e só então o
// "Confirmar e pagar" volta a funcionar.
export function ReviewDialog({ open, onOpenChange, latestQuote, buildInput, wallet, onQuoteRejected }: ReviewDialogProps) {
  const [reviewed, setReviewed] = useState(latestQuote)
  const placeOrder = usePlaceOrder()
  const changed = latestQuote.id !== reviewed.id
  const input = buildInput(reviewed.id)

  // Trava SÍNCRONA contra clique duplo. O isPending só vira true no próximo
  // render, e o 1º clique ainda espera a carteira conectar: nesse meio-tempo
  // um 2º clique passaria. A ref muda na hora, sem esperar render.
  const inFlight = useRef(false)

  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      await send()
    } finally {
      inFlight.current = false
    }
  }

  const send = async () => {
    placeOrder.reset()
    // 1. Conecta a carteira, se ainda não estiver (pode ser recusada).
    if (!wallet.connection) {
      try {
        await wallet.connect.mutateAsync({ provider: input.wallet.provider, address: input.wallet.address })
      } catch {
        return // a mensagem aparece abaixo (wallet.connect.error)
      }
    }
    // 2. Cria o pedido com a Idempotency-Key desta tentativa.
    await placeOrder
      .mutateAsync(startAttempt(input))
      .catch((error: ApiError) => {
        if (error.code === 'QUOTE_CHANGED') {
          clearAttempt()
          onQuoteRejected() // busca a cotação nova; o aviso aparece sozinho
        }
        if (error.code === 'IDEMPOTENCY_CONFLICT') clearAttempt()
      })
  }

  const busy = wallet.connect.isPending || placeOrder.isPending
  const error = wallet.connect.error ?? (placeOrder.error?.code === 'QUOTE_CHANGED' ? null : placeOrder.error)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Enviando: não deixa fechar (Esc/clique fora) no meio do pagamento.
        if (busy) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[min(92vw,560px)] max-w-none gap-5 overflow-y-auto bg-card p-6 sm:max-w-none">
        <DialogTitle className="text-xl">Revise seu pedido</DialogTitle>
        <DialogDescription className="text-text-secondary">
          Confira itens, valores e carteira. A compra só é enviada quando você confirmar.
        </DialogDescription>

        {changed && (
          <div role="alert" className="flex flex-col gap-2 rounded-md border border-primary bg-primary/10 p-4 text-sm">
            <strong>Os valores mudaram desde a sua revisão.</strong>
            <span>
              Total anterior: {formatEth(reviewed.summary.total)} · novo total: {formatEth(latestQuote.summary.total)}
              {latestQuote.blocked && '. Algum item esgotou: volte ao carrinho para ajustar.'}
            </span>
            {!latestQuote.blocked && (
              <button type="button" onClick={() => setReviewed(latestQuote)} className="self-start font-bold text-text-accent underline underline-offset-4">
                Ver os novos valores
              </button>
            )}
          </div>
        )}

        <OrderSummary quote={reviewed} compact />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-text-secondary">Comprador</dt>
          <dd>
            {input.buyer.displayName} · {input.buyer.email}
          </dd>
          <dt className="text-text-secondary">Carteira</dt>
          <dd>
            {WALLET_PROVIDER_LABELS[input.wallet.provider]} · {shortAddress(input.wallet.address)}
          </dd>
          <dt className="text-text-secondary">Rede</dt>
          <dd>{NETWORK_LABELS[input.wallet.network]}</dd>
        </dl>

        <div aria-live="polite" className="text-sm">
          {wallet.connect.isPending && <p>Aguardando autorização na {WALLET_PROVIDER_LABELS[input.wallet.provider]}…</p>}
          {placeOrder.isPending && <p>Enviando o pedido… não feche esta janela.</p>}
          {placeOrder.failureCount > 0 && placeOrder.isPending && (
            <p className="text-text-secondary">A conexão falhou; tentando de novo com a mesma tentativa (sem duplicar o pedido).</p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={() => onOpenChange(false)} className="h-11 rounded-[4px] border border-border px-5 font-bold disabled:opacity-50">
            Voltar
          </button>
          <button
            type="button"
            disabled={busy || changed || reviewed.blocked}
            onClick={() => void confirm()}
            className="h-11 rounded-[4px] bg-primary px-6 font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Processando…' : `Confirmar e pagar ${formatEth(reviewed.summary.total)}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
