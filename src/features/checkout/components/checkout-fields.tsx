import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const controlClass = cn(
  'w-full rounded-[4px] border border-border bg-transparent px-3 text-sm text-foreground',
  'placeholder:text-text-subtle focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-ring',
  'aria-invalid:border-destructive read-only:cursor-default read-only:text-text-secondary',
)

interface FieldShellProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; 'aria-required'?: true }) => ReactNode
}

// Rótulo visível + asterisco do Figma + erro ligado ao campo (aria-describedby).
// O asterisco é decorativo (aria-hidden); quem diz "obrigatório" ao leitor de
// tela é o aria-required.
function FieldShell({ label, required, error, hint, className, children }: FieldShellProps) {
  const id = useId()
  const describedBy = [error && `${id}-erro`, hint && `${id}-dica`].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-[15px] leading-5">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-lg leading-none text-text-accent">
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && (
        <p id={`${id}-dica`} className="text-xs text-text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label: string; required?: boolean; error?: string; hint?: string; className?: string }

export function TextField({ label, required, error, hint, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      {(aria) => <input {...aria} {...props} className={cn(controlClass, 'h-10')} />}
    </FieldShell>
  )
}

export function SelectField({ label, required, error, hint, className, children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      {/* <select> nativo: teclado, leitor de tela e o seletor do celular de graça */}
      {(aria) => (
        <select {...aria} {...props} className={cn(controlClass, 'h-10 bg-background text-text-secondary')}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}

export function TextAreaField({ label, required, error, hint, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      {(aria) => <textarea {...aria} {...props} className={cn(controlClass, 'min-h-38 resize-y py-2')} />}
    </FieldShell>
  )
}
