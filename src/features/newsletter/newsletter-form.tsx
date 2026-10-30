import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'

import { newsletterSignupSchema, type NewsletterSignup } from '@/contracts/newsletter'

import { subscribeNewsletter } from './api'

export function NewsletterForm() {
  const inputId = useId()
  const errorId = useId()

  // react-hook-form: guarda os valores e erros do formulário sem re-renderizar a
  // cada tecla. O zodResolver faz o MESMO schema do mock validar aqui no front.
  const form = useForm<NewsletterSignup>({
    resolver: zodResolver(newsletterSignupSchema),
    defaultValues: { email: '' },
  })

  // useMutation: para requisições que ALTERAM dados (POST/PUT/DELETE).
  // Diferente do useQuery, não roda sozinha: só quando chamamos mutate().
  const subscription = useMutation({
    mutationFn: subscribeNewsletter,
    onSuccess: () => form.reset(),
    onError: (error) => {
      // Erro do servidor vira erro do campo, no mesmo lugar dos erros do front.
      const message = error.fieldErrors.email?.[0] ?? error.message
      form.setError('email', { message })
    },
  })

  const errorMessage = form.formState.errors.email?.message

  return (
    <form
      noValidate // a validação é nossa (zod), não a do navegador
      onSubmit={form.handleSubmit((values) => subscription.mutate(values))}
      className="flex flex-col gap-3"
    >
      <label htmlFor={inputId} className="sr-only">
        Seu e-mail
      </label>
      <div className="flex h-10 items-center rounded-md bg-surface-dark shadow-[0_0_10px_rgba(10,6,4,0.45)]">
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="digite seu e-mail..."
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent pl-3 text-sm leading-4 text-foreground placeholder:text-text-subtle focus-visible:outline-offset-0"
          {...form.register('email')}
        />
        <button
          type="submit"
          // Desabilitar durante o envio evita inscrições duplicadas por clique repetido.
          disabled={subscription.isPending}
          className="flex h-10 w-21.25 shrink-0 items-center justify-center rounded-r-md bg-primary pr-1 pl-4 text-lg leading-4 font-bold text-ink disabled:opacity-60"
        >
          {subscription.isPending ? '...' : 'Enviar'}
        </button>
      </div>

      {/* role="alert" e role="status" fazem o leitor de tela anunciar a mensagem
          assim que ela aparece, sem o usuário precisar procurar. */}
      {errorMessage && (
        <p id={errorId} role="alert" className="text-[13px] leading-5.5 text-destructive">
          {errorMessage}
        </p>
      )}
      {subscription.isSuccess && (
        <p role="status" className="text-[13px] leading-5.5 text-text-accent">
          Inscrição confirmada para {subscription.data.email}.
        </p>
      )}
    </form>
  )
}
