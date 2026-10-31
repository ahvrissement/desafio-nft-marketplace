import type { ReactNode } from 'react'

import type { NftEdition } from '@/contracts/nft'
import { cn } from '@/lib/utils'

interface EditionPickerProps {
  editions: NftEdition[]
  selectedId: string
  onSelect: (id: string) => void
  // Texto ao lado das opções (estoque da edição escolhida)
  hint?: ReactNode
  className?: string
}

// "Edição: 1/1 · 1/10 · 1/50 · ABERTA".
// Escolher UMA entre várias = grupo de rádios. Usamos o <input type="radio">
// nativo (escondido com sr-only), como nos filtros: setas do teclado, "1 de 4"
// e "indisponível" no leitor de tela vêm de graça.
// Edição esgotada fica `disabled`: não dá para selecionar e o leitor anuncia.
export function EditionPicker({ editions, selectedId, onSelect, hint, className }: EditionPickerProps) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-[15px] leading-4 font-bold lg:mb-3">Edição:</legend>
      <div className="flex flex-wrap items-center gap-3 lg:gap-1.5">
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <label
              key={edition.id}
              className={cn(
                'flex h-7 items-center rounded-full border border-border px-1.5 text-[13px] leading-4 uppercase lg:text-sm',
                'has-focus-visible:outline-2 has-focus-visible:outline-ring',
                'has-checked:border-primary has-checked:font-bold has-checked:text-text-accent',
                // Esgotada: riscada E mais apagada (não depende só da cor)
                soldOut ? 'cursor-not-allowed text-text-subtle/60 line-through' : 'cursor-pointer hover:border-primary',
              )}
            >
              <input
                type="radio"
                name="edition"
                value={edition.id}
                checked={edition.id === selectedId}
                disabled={soldOut}
                onChange={() => onSelect(edition.id)}
                className="sr-only"
              />
              {edition.label}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
        {hint}
      </div>
    </fieldset>
  )
}
