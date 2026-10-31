import { useId, useState, type InputHTMLAttributes } from 'react'

import eyeHideIcon from '@/assets/icons/eye-hide.svg'
import eyeShowIcon from '@/assets/icons/eye-show.svg'
import { MaskIcon } from '@/components/mask-icon'
import { cn } from '@/lib/utils'

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const inputClass = cn(
  'h-12.5 w-full rounded-[10px] border border-border bg-transparent px-4 text-sm text-foreground lg:h-10 lg:rounded-[4px]',
  'placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-ring',
  'aria-invalid:border-destructive',
)

// Campo do Figma (só placeholder) + o que a acessibilidade exige:
//   - <label> de verdade, escondida (placeholder some ao digitar e não é rótulo);
//   - erro ligado ao campo por aria-describedby, e aria-invalid no input.
export function AuthField({ label, error, className, ...inputProps }: AuthFieldProps) {
  const id = useId()
  const errorId = `${id}-erro`
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
        {...inputProps}
      />
      <FieldError id={errorId} message={error} />
    </div>
  )
}

// O olho do Figma ("Iconly/Curved/Hide"): mostra/esconde a senha.
export function PasswordField({ label, error, className, ...inputProps }: AuthFieldProps) {
  const id = useId()
  const errorId = `${id}-erro`
  const [visible, setVisible] = useState(false)
  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClass, 'pr-12')}
          {...inputProps}
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-1 grid w-10 place-items-center text-text-subtle hover:text-text-accent"
        >
          <MaskIcon src={visible ? eyeShowIcon : eyeHideIcon} width={22} height={20} />
        </button>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 text-left text-xs text-destructive">
      {message}
    </p>
  )
}
