import { Link } from '@tanstack/react-router'
import { useId, useState, type FormEvent } from 'react'

import type { Cart } from '@/contracts/cart'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

import { useCartActions } from '../use-cart'

// "Resumo da carteira" do Figma. Todos os números vêm da API (cart.summary):
// o front não soma nada, então carrinho e checkout nunca discordam.
export function CartSummary({ cart }: { cart: Cart }) {
  const { summary } = cart
  // Item esgotado ou acima do estoque precisa ser resolvido antes de pagar.
  const blocked = cart.items.some((item) => item.issues.includes('sold_out') || item.issues.includes('insufficient_stock'))

  return (
    <section aria-labelledby="resumo-titulo" className="flex flex-col rounded-t-[30px] bg-card px-6 pt-6 pb-8 lg:rounded-none lg:bg-transparent lg:p-0">
      <h2 id="resumo-titulo" className="hidden border-b border-border pb-3 text-lg leading-6 font-bold lg:block">
        Resumo da carteira
      </h2>

      <CouponForm cart={cart} />

      {/* <dl>: pares "nome → valor", lidos juntos pelo leitor de tela */}
      <dl className="mt-6 flex flex-col gap-3 text-[15px] leading-5">
        <SummaryRow label="Subtotal" value={formatEth(summary.subtotal)} />
        <SummaryRow
          label={summary.coupon ? `Desconto (${summary.coupon.code})` : 'Desconto do lançamento'}
          value={`(-) ${formatEth(summary.discount)}`}
        />
        <SummaryRow label="Taxa de rede" value={formatEth(summary.networkFee)} hint="Taxa estimada" />
        <SummaryRow label="Total" value={formatEth(summary.total)} strong className="mt-4" />
      </dl>

      {blocked && (
        <p className="mt-4 text-sm text-destructive">Resolva os avisos dos itens para finalizar a compra.</p>
      )}
      {/* O checkout é privado: o próprio /checkout pede login se precisar */}
      {blocked ? (
        <button type="button" disabled className={cn(finishClass, 'cursor-not-allowed opacity-50')}>
          Conectar e finalizar
        </button>
      ) : (
        <Link to="/checkout" className={finishClass}>
          Conectar e finalizar
        </Link>
      )}
      <Link to="/" hash="mercado" className="mt-5 hidden text-center text-[15px] text-text-accent hover:underline lg:block">
        Continuar explorando
      </Link>
    </section>
  )
}

const finishClass =
  'mt-8 grid h-15 place-items-center rounded-full bg-linear-to-r from-primary to-[#b07440] text-base font-bold text-ink hover:brightness-110 lg:mt-6 lg:h-10 lg:rounded-[4px] lg:bg-primary lg:bg-none lg:text-[15px]'

function SummaryRow({ label, value, hint, strong, className }: { label: string; value: string; hint?: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-wrap justify-between gap-x-4', className)}>
      <dt className={cn(strong && 'font-bold')}>{label}</dt>
      <dd className={cn(strong ? 'text-lg font-bold text-text-accent' : 'text-base')}>{value}</dd>
      {hint && <dd className="w-full text-right text-xs text-text-accent">{hint}</dd>}
    </div>
  )
}

// "Código promocional": aplicar e remover. O erro (inválido, vencido) vem da API
// e fica ligado ao campo por aria-describedby.
function CouponForm({ cart }: { cart: Cart }) {
  const { coupon, clearCoupon } = useCartActions()
  const [code, setCode] = useState('')
  const inputId = useId()
  const errorId = `${inputId}-erro`
  const error = coupon.error?.fieldErrors.code?.[0] ?? coupon.error?.message

  const applied = cart.summary.coupon
  if (applied) {
    return (
      <div className="mt-6 flex items-center justify-between gap-3 rounded-[10px] border border-primary/60 px-4 py-3 text-sm lg:rounded-[4px]">
        <p>
          <strong className="text-text-accent">{applied.code}</strong> · {applied.label}
        </p>
        <button type="button" disabled={clearCoupon.isPending} onClick={() => clearCoupon.mutate()} className="shrink-0 font-bold text-text-accent underline underline-offset-4">
          Remover
        </button>
      </div>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    coupon.mutate({ code }, { onSuccess: () => setCode('') })
  }

  return (
    <form noValidate onSubmit={submit} className="lg:mt-6">
      <label htmlFor={inputId} className="hidden text-[15px] font-bold lg:mb-2 lg:block">
        Código promocional
      </label>
      <div className="flex h-12.5 overflow-hidden rounded-full border border-border bg-background has-focus-visible:outline-2 has-focus-visible:outline-ring lg:h-10 lg:rounded-[4px] lg:border-primary">
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            coupon.reset() // começou a corrigir: some o erro antigo
          }}
          placeholder="Digite o código promocional..."
          aria-label="Código promocional"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoCapitalize="characters"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm uppercase outline-none placeholder:normal-case placeholder:text-text-subtle"
        />
        <button
          type="submit"
          disabled={coupon.isPending || !code.trim()}
          className="shrink-0 rounded-full bg-linear-to-r from-primary to-[#b07440] px-4 text-[15px] font-bold text-ink disabled:opacity-60 lg:rounded-none lg:bg-primary lg:bg-none lg:px-5"
        >
          {coupon.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
