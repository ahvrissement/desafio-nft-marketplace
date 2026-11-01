import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, getRouteApi } from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

import closeIcon from '@/assets/icons/close.svg'
import { MaskIcon } from '@/components/mask-icon'
import type { Order } from '@/contracts/checkout'
import { NETWORK_LABELS } from '@/contracts/nft'
import { useSession } from '@/features/auth/use-session'
import { clearAttempt } from '@/features/checkout/attempt'
import { shortAddress } from '@/features/checkout/form'
import { checkoutQueries } from '@/features/checkout/queries'
import { formatEth } from '@/lib/money'

const route = getRouteApi('/orders/$orderId')
// "31 out, 2026" (formato curto do Figma: "29 Jul, 2026"), montado por partes
// porque o pt-BR padrão escreve "31 de out. de 2026" e quebraria a linha.
const dateParts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const formatDate = (date: Date) => {
  const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.formatToParts(date).find((item) => item.type === type)?.value ?? ''
  return `${part('day')} ${part('month').replace('.', '')}, ${part('year')}`
}

export function OrderPage() {
  const { orderId } = route.useParams()
  const { user } = useSession()
  const queryClient = useQueryClient()
  const { data: order, isPending, isError, error } = useQuery({
    ...checkoutQueries.order(user?.id ?? '', orderId),
    enabled: Boolean(user),
  })
  const status = order?.status

  // Pedido decidido (confirmado ou recusado): a tentativa acabou. Confirmado
  // também mudou o carrinho (itens comprados saíram) e o estoque no servidor.
  useEffect(() => {
    if (!status || status === 'pending') return
    clearAttempt()
    if (status === 'confirmed') {
      void queryClient.invalidateQueries({ queryKey: ['me', user?.id, 'cart'] })
      void queryClient.invalidateQueries({ queryKey: ['me', user?.id, 'quote'] })
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
    }
  }, [status, queryClient, user?.id])

  if (isError) {
    return (
      <Centered>
        <title>Pedido não encontrado | Kurio</title>
        <h1 className="text-2xl font-bold">{error.code === 'NOT_FOUND' ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1>
        <Link to="/" className="mt-4 rounded-[5px] bg-primary px-6 py-3 font-bold text-ink">Voltar ao início</Link>
      </Centered>
    )
  }
  if (isPending || !order) return <Pending />
  if (order.status === 'pending') return <Pending />
  if (order.status === 'declined') return <Declined order={order} />
  return <Receipt order={order} />
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="page-container flex flex-col items-center py-24 text-center">{children}</div>
}

// role="status": o leitor de tela ouve "aguardando" e, depois, a troca de tela.
function Pending() {
  return (
    <Centered>
      <title>Aguardando confirmação | Kurio</title>
      <div role="status" className="flex flex-col items-center gap-4">
        <span aria-hidden className="size-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary motion-reduce:animate-none" />
        <h1 className="text-2xl font-bold">Aguardando a confirmação da rede…</h1>
        <p className="max-w-md text-text-secondary">
          Seu pedido foi enviado. Você pode recarregar a página: o andamento continua de onde parou, sem criar outra compra.
        </p>
      </div>
    </Centered>
  )
}

function Declined({ order }: { order: Order }) {
  return (
    <Centered>
      <title>Pagamento recusado | Kurio</title>
      <div role="alert" className="flex max-w-lg flex-col items-center gap-4">
        <p className="text-sm font-bold text-destructive uppercase">Pagamento recusado</p>
        <h1 className="text-2xl font-bold">Sua compra não foi concluída</h1>
        <p className="text-text-secondary">{order.declineReason}</p>
        <p className="text-text-secondary">Seus itens continuam no carrinho.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link to="/checkout" className="rounded-[5px] bg-primary px-6 py-3 font-bold text-ink">Tentar de novo</Link>
          <Link to="/cart" className="rounded-[5px] border border-border px-6 py-3 font-bold">Ver carrinho</Link>
        </div>
      </div>
    </Centered>
  )
}

// O recibo do Figma ("Confirmação de pedido"). Tudo vem do SNAPSHOT do pedido:
// mudanças posteriores no catálogo não alteram o que foi pago.
function Receipt({ order }: { order: Order }) {
  const tx = order.transaction!
  return (
    <div className="page-container flex justify-center py-10 lg:py-24">
      <title>Pedido confirmado | Kurio</title>
      <article aria-labelledby="recibo-titulo" className="relative w-full max-w-144.5 bg-card">
        <Link to="/" aria-label="Fechar e voltar ao início" className="absolute top-3 right-3 grid size-10 place-items-center text-text-accent hover:text-foreground">
          <MaskIcon src={closeIcon} width={18} height={18} />
        </Link>

        <header className="flex flex-col items-center gap-4 border-b border-primary px-6 pt-6 pb-5">
          <ThankYouIcon />
          <h1 id="recibo-titulo" className="text-center text-base font-bold text-text-secondary">
            Seus NFTs agora estão na sua carteira
          </h1>
        </header>

        <dl className="grid grid-cols-2 gap-y-3 border-b border-primary px-6 py-3 text-sm sm:grid-cols-4 sm:divide-x sm:divide-primary">
          <Info label="ID da transação" value={shortAddress(tx.hash)} strong />
          <Info label="Data" value={formatDate(new Date(order.settledAt ?? order.createdAt))} />
          <Info label="Total" value={formatEth(order.summary.total)} />
          <Info label="Carteira" value={order.wallet.providerLabel} strong />
        </dl>

        <div className="px-6 pt-6 pb-8 sm:px-11">
          <h2 className="text-[15px] font-bold">Detalhes da transação</h2>
          <table className="mt-3 w-full border-separate border-spacing-y-3">
            <caption className="sr-only">Itens comprados</caption>
            <thead>
              <tr className="text-left text-[15px] font-bold">
                <th scope="col" className="border-b border-border pb-3">NFTs</th>
                {/* No Figma: "Edições"; mostra a quantidade comprada */}
                <th scope="col" className="border-b border-border pb-3 text-center">Qtd.</th>
                <th scope="col" className="border-b border-border pb-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.nftId}-${item.editionId}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={item.image.small} width={400} height={400} alt="" className="size-17.5 shrink-0 rounded-[4px] object-cover" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-bold">{item.name}</span>
                        <span className="text-[13px] text-text-subtle">
                          ID do token: {item.tokenId} · {item.editionLabel}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="text-center text-[13px] text-text-secondary">(x {item.quantity})</td>
                  <td className="text-right text-lg font-bold whitespace-nowrap text-text-accent">{formatEth(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto flex max-w-80 flex-col gap-2 border-b border-border pb-3 text-[15px]">
            {order.summary.couponCode && (
              <div className="flex justify-between">
                <dt>Desconto ({order.summary.couponCode})</dt>
                <dd>(-) {formatEth(order.summary.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(order.summary.networkFee)}</dd>
            </div>
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-lg text-text-accent">{formatEth(order.summary.total)}</dd>
            </div>
          </dl>

          <p className="mt-5 text-center text-sm leading-6 text-text-secondary">
            Transação confirmada na {NETWORK_LABELS[order.wallet.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            {/* README: "referências de transação e links de exploração são simulados".
                O aviso fica VISÍVEL: o hash não existe na rede real, e o Etherscan vai dizer isso. */}
            <a
              href={tx.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby="aviso-transacao-simulada"
              className="rounded-[4px] bg-primary px-4 py-3 font-bold text-ink hover:bg-text-accent"
            >
              Ver no Etherscan
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            <p id="aviso-transacao-simulada" className="text-xs text-text-subtle">
              Transação simulada: o Etherscan não vai encontrar este hash.
            </p>
          </div>
        </div>
        <div aria-hidden className="h-2.5 bg-primary" />
      </article>
    </div>
  )
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 first:pl-0 sm:px-4">
      <dt className={strong ? 'font-bold text-text-secondary' : 'text-text-secondary'}>{label}</dt>
      <dd translate="no" className="text-text-secondary">{value}</dd>
    </div>
  )
}

// Envelope "THANK YOU" do Figma, redesenhado em SVG (traço laranja).
function ThankYouIcon() {
  return (
    <svg aria-hidden width="66" height="80" viewBox="0 0 66 80" fill="none" className="text-primary">
      <path d="M4 34 33 56 62 34" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M4 34v40h58V34M4 74l22-18M62 74 40 56" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M10 39V8h46v31" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m27 8 6-5 6 5" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <text x="33" y="22" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="700" fontFamily="inherit">THANK</text>
      <text x="33" y="33" textAnchor="middle" fill="currentColor" fontSize="10" fontWeight="700" fontFamily="inherit">YOU</text>
    </svg>
  )
}
