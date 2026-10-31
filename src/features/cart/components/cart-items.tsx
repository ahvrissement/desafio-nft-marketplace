import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import trashIcon from '@/assets/icons/trash.svg'
import { MaskIcon } from '@/components/mask-icon'
import { QuantityStepper } from '@/components/quantity-stepper'
import type { CartItem } from '@/contracts/cart'
import { formatEth } from '@/lib/money'

import { useCartActions } from '../use-cart'

// Itens do carrinho: tabela no desktop (como no Figma), cards no mobile.
// Os dois usam as mesmas ações; só o layout muda.
export function CartItems({ items }: { items: CartItem[] }) {
  const actions = useCartActions()
  const busyId = actions.update.isPending ? actions.update.variables?.itemId : undefined

  const setQuantity = (item: CartItem, quantity: number) => actions.update.mutate({ itemId: item.id, input: { quantity } })
  const remove = (item: CartItem) => actions.remove.mutate({ itemId: item.id, name: item.name })

  return (
    <>
      {/* ---------- Desktop: <table> de verdade (o leitor de tela anuncia linha e coluna) ---------- */}
      <table className="hidden w-full border-separate border-spacing-y-3 lg:table">
        <caption className="sr-only">Itens no carrinho</caption>
        <thead>
          <tr className="text-left text-base leading-4 font-bold">
            {/* O Figma chama esta coluna de "Edições", mas ela mostra a QUANTIDADE */}
            <th scope="col" className="w-77.75 border-b border-border pb-3">NFTs</th>
            <th scope="col" className="w-34.5 border-b border-border pb-3">Preço</th>
            <th scope="col" className="w-34 border-b border-border pb-3">Quantidade</th>
            <th scope="col" className="border-b border-border pb-3">Total</th>
            <th scope="col" className="w-12 border-b border-border pb-3">
              <span className="sr-only">Remover</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} aria-busy={busyId === item.id || undefined} className="bg-card">
              <td className="p-0">
                <div className="flex items-center gap-4">
                  <ItemImage item={item} className="size-17.5" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <ItemName item={item} className="text-base leading-4 font-bold" />
                    {/* O Figma mostra só o ID; a edição também identifica o item do carrinho */}
                    <span className="text-[13px] leading-4 text-text-subtle">ID do token: {item.tokenId}</span>
                    <span className="text-[13px] leading-4 text-text-subtle">Edição: {item.editionLabel}</span>
                  </div>
                </div>
              </td>
              <td className="text-base font-bold text-text-subtle">{formatEth(item.unitPrice)}</td>
              <td>
                <QuantityStepper
                  size="sm"
                  hideLabel
                  label={`Quantidade de ${item.name}`}
                  value={item.quantity}
                  max={Math.max(item.quantity, item.maxQuantity)}
                  busy={busyId === item.id}
                  onChange={(quantity) => setQuantity(item, quantity)}
                />
              </td>
              <td className="text-base font-bold text-text-accent">{formatEth(item.lineTotal)}</td>
              <td className="pr-6 text-right">
                <RemoveButton item={item} onRemove={remove} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Avisos de cada item (preço mudou, estoque caiu) ficam fora da tabela,
          numa lista própria, para não quebrar a grade. */}
      <ItemIssues items={items} onQuantity={setQuantity} onAcknowledge={(item) => actions.update.mutate({ itemId: item.id, input: { acknowledgePrice: true } })} onRemove={remove} />

      {/* ---------- Mobile: cards ---------- */}
      <ul className="flex flex-col gap-5 lg:hidden">
        {items.map((item) => (
          <li key={item.id} aria-busy={busyId === item.id || undefined} className="relative grid grid-cols-[100px_1fr] overflow-hidden rounded-[16px] bg-card">
            <ItemImage item={item} className="size-25" />
            <div className="flex min-w-0 flex-col justify-center gap-1 py-2 pr-3 pl-2.5">
              <ItemName item={item} className="truncate pr-8 text-[15px] leading-5 font-bold" />
              <span className="text-[13px] leading-4 text-text-subtle">Edição: {item.editionLabel}</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg leading-6 font-bold text-text-accent">{formatEth(item.lineTotal)}</span>
                <QuantityStepper
                  size="sm"
                  hideLabel
                  label={`Quantidade de ${item.name}`}
                  value={item.quantity}
                  max={Math.max(item.quantity, item.maxQuantity)}
                  busy={busyId === item.id}
                  onChange={(quantity) => setQuantity(item, quantity)}
                />
              </div>
            </div>
            <RemoveButton item={item} onRemove={remove} className="absolute top-1 right-1" />
          </li>
        ))}
      </ul>
    </>
  )
}

function ItemImage({ item, className }: { item: CartItem; className: string }) {
  return <img src={item.image.small} width={400} height={400} alt="" loading="lazy" className={`${className} shrink-0 object-cover`} />
}

// O nome leva ao detalhe, já na edição que está no carrinho.
function ItemName({ item, className }: { item: CartItem; className: string }) {
  return (
    <Link to="/nft/$id" params={{ id: item.nftId }} search={{ edition: item.editionId }} className={`${className} hover:text-text-accent`}>
      {item.name}
    </Link>
  )
}

function RemoveButton({ item, onRemove, className }: { item: CartItem; onRemove: (item: CartItem) => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={`Remover ${item.name} do carrinho`}
      onClick={() => onRemove(item)}
      className={`grid size-10 place-items-center text-text-subtle hover:text-destructive ${className ?? ''}`}
    >
      <MaskIcon src={trashIcon} width={24} height={24} />
    </button>
  )
}

interface ItemIssuesProps {
  items: CartItem[]
  onQuantity: (item: CartItem, quantity: number) => void
  onAcknowledge: (item: CartItem) => void
  onRemove: (item: CartItem) => void
}

// "O preço mudou", "só restam 2", "esgotou". A API detecta; aqui só mostramos,
// com a ação que resolve cada caso. role="status" anuncia quando aparecem
// (inclusive quando chegarem por Socket.IO, no passo do tempo real).
function ItemIssues({ items, onQuantity, onAcknowledge, onRemove }: ItemIssuesProps) {
  const withIssues = items.filter((item) => item.issues.length > 0)
  return (
    <div role="status" className="empty:hidden">
      {withIssues.length > 0 && (
        <ul className="mb-5 flex flex-col gap-2 rounded-md border border-primary/60 bg-primary/10 p-4 text-sm lg:mt-2 lg:mb-0">
          {withIssues.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <strong>{item.name}:</strong>
              {item.issues.includes('sold_out') ? (
                <>
                  <span>esta edição esgotou e não entra no total.</span>
                  <IssueAction onClick={() => onRemove(item)}>Remover</IssueAction>
                </>
              ) : item.issues.includes('insufficient_stock') ? (
                <>
                  <span>só restam {item.maxQuantity} unidades.</span>
                  <IssueAction onClick={() => onQuantity(item, item.maxQuantity)}>Ajustar para {item.maxQuantity}</IssueAction>
                </>
              ) : null}
              {item.issues.includes('price_changed') && item.previousUnitPrice && (
                <>
                  <span>
                    o preço mudou de {formatEth(item.previousUnitPrice)} para {formatEth(item.unitPrice)}.
                  </span>
                  <IssueAction onClick={() => onAcknowledge(item)}>Entendi</IssueAction>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IssueAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-bold text-text-accent underline underline-offset-4">
      {children}
    </button>
  )
}
