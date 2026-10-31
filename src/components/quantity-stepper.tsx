import { useId } from 'react'

import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  // "lg": desktop (círculos de 33×49 do Figma). "sm": barra de compra do mobile.
  size?: 'sm' | 'lg'
  label?: string
  // Rótulo só para o leitor de tela (no carrinho: "Quantidade de Emerald Ape #042")
  hideLabel?: boolean
  // Esta linha está salvando: o número fica "ocupado" para o leitor de tela
  busy?: boolean
  className?: string
}

// Botões − e + com o número no meio.
//
// Nos limites, os botões ficam aria-disabled, e não `disabled`. Um botão
// `disabled` perde o foco: quem chega ao máximo apertando Enter no "+" seria
// jogado para o começo da página. Com aria-disabled, o foco fica, o leitor de
// tela diz "indisponível" e o clique é ignorado no handler.
export function QuantityStepper({ value, min = 1, max, onChange, size = 'lg', label = 'Quantidade', hideLabel = false, busy = false, className }: QuantityStepperProps) {
  const labelId = useId()
  const atMin = value <= min
  const atMax = value >= max

  const buttonClass = cn(
    'grid place-items-center rounded-full bg-primary text-ink transition-opacity',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    size === 'lg' ? 'h-12.5 w-8.25 text-2xl' : 'h-7.5 w-5 rounded-md text-base',
  )

  return (
    <div role="group" aria-labelledby={labelId} className={cn('flex items-center', className)}>
      <span id={labelId} className={cn((size === 'lg' || hideLabel) && 'sr-only', 'mr-2 text-[15px] font-bold')}>
        {label}
        {size === 'sm' && !hideLabel && '.'}
      </span>
      <button
        type="button"
        aria-label="Diminuir quantidade"
        aria-disabled={atMin}
        onClick={() => !atMin && onChange(value - 1)}
        className={buttonClass}
      >
        <span aria-hidden>−</span>
      </button>
      {/* <output> + aria-live: o leitor de tela anuncia o novo número a cada clique */}
      <output aria-live="polite" aria-busy={busy || undefined} className={cn('text-center tabular-nums', size === 'lg' ? 'w-12 text-xl' : 'w-8 text-xl font-bold')}>
        {value}
      </output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        aria-disabled={atMax}
        onClick={() => !atMax && onChange(value + 1)}
        className={buttonClass}
      >
        <span aria-hidden>+</span>
      </button>
    </div>
  )
}
