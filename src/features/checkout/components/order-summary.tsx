import { Link } from '@tanstack/react-router'

import type { Quote } from '@/contracts/checkout'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

// "Seus NFTs" + totais do Figma. Os números são os da COTAÇÃO da API.
export function OrderSummary({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  const { summary } = quote
  return (
    <div className="flex flex-col">
      <table className="w-full border-separate border-spacing-y-3">
        <caption className="sr-only">Itens do pedido</caption>
        <thead className={cn(compact && 'sr-only')}>
          <tr className="text-left text-base font-bold">
            <th scope="col" className="border-b border-border pb-3">NFTs</th>
            <th scope="col" className="border-b border-border pb-3 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item) => (
            <tr key={item.id} className="bg-card">
              <td className="p-0">
                <div className="flex items-center gap-2">
                  <img src={item.image.small} width={400} height={400} alt="" className="size-17.5 shrink-0 object-cover" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-[15px] font-bold">{item.name}</span>
                    <span className="text-[13px] text-text-subtle">
                      ID do token: {item.tokenId} · {item.editionLabel}
                    </span>
                  </div>
                </div>
              </td>
              <td className="pr-4 text-right whitespace-nowrap">
                <span className="mr-2 text-[13px] text-text-secondary">
                  <span aria-hidden>(x {item.quantity})</span>
                  <span className="sr-only">{item.quantity} unidades,</span>
                </span>
                <strong className="text-lg text-text-accent">{formatEth(item.lineTotal)}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!compact && (
        <p className="mt-2 text-center text-[13px]">
          Tem um código promocional?{' '}
          <Link to="/cart" className="text-text-accent underline underline-offset-4">
            Aplique no carrinho
          </Link>
        </p>
      )}

      <dl className="mt-3 flex flex-col gap-3 text-[15px]">
        <Row label="Subtotal" value={formatEth(summary.subtotal)} />
        <Row label={summary.coupon ? `Desconto (${summary.coupon.code})` : 'Desconto do lançamento'} value={`(-) ${formatEth(summary.discount)}`} />
        <Row label="Taxa de rede" value={formatEth(summary.networkFee)} />
        <div className="flex justify-between border-t border-border pt-3">
          <dt className="font-bold">Total</dt>
          <dd className="text-lg font-bold text-text-accent">{formatEth(summary.total)}</dd>
        </div>
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
