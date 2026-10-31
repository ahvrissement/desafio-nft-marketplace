import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { ComingSoon } from '@/components/coming-soon'
import { loginInputSchema, signupInputSchema, type LoginInput } from '@/contracts/auth'
import { cn } from '@/lib/utils'

import { login, signup } from '../api'
import { applyServerErrors } from '../server-errors'
import { firstName, useAuthSuccess } from '../use-auth-success'
import { AuthField, PasswordField } from './auth-field'

const submitClass =
  'h-15 w-full rounded-[10px] bg-primary text-base font-bold text-ink hover:bg-text-accent disabled:cursor-wait disabled:opacity-70 lg:mx-auto lg:h-11.25 lg:w-85 lg:rounded-[4px]'

export function LoginForm() {
  const onSuccess = useAuthSuccess()
  const form = useForm<LoginInput>({ resolver: zodResolver(loginInputSchema), defaultValues: { email: '', password: '' } })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => onSuccess(response, `Bem-vindo de volta, ${firstName(response.user.name)}!`),
    onError: (error) => applyServerErrors(error, form.setError, ['email', 'password']),
  })

  return (
    // noValidate: as mensagens são as nossas (em português, ligadas ao campo),
    // não os balões nativos do navegador.
    <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="flex flex-col">
      <div className="flex flex-col gap-3 lg:mx-auto lg:w-85">
        <AuthField label="E-mail" type="email" autoComplete="email" placeholder="contato@email.com" error={errors.email?.message} {...form.register('email')} />
        <PasswordField label="Senha" autoComplete="current-password" placeholder="Senha" error={errors.password?.message} {...form.register('password')} />
        <ComingSoon className="self-end text-sm text-text-accent">Esqueceu a senha?</ComingSoon>
      </div>
      <FormError message={errors.root?.server?.message} />
      <button type="submit" disabled={mutation.isPending} className={cn(submitClass, 'mt-10 lg:mt-6')}>
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

// O "confirmar senha" só existe no formulário: a API recebe nome, e-mail e senha.
const signupFormSchema = signupInputSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a senha.') })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })
type SignupForm = z.input<typeof signupFormSchema>

export function SignupForm() {
  const onSuccess = useAuthSuccess()
  const form = useForm<SignupForm>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: (response) => onSuccess(response, `Conta criada. Boas-vindas, ${firstName(response.user.name)}!`),
    // 409 (e-mail já cadastrado) vem com fieldErrors.email: a mensagem aparece no campo.
    onError: (error) => applyServerErrors(error, form.setError, ['name', 'email', 'password']),
  })

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ name, email, password }) => mutation.mutate({ name, email, password }))}
      className="flex flex-col"
    >
      <div className="flex flex-col gap-3 lg:mx-auto lg:w-85">
        <AuthField label="Nome de usuário" autoComplete="nickname" placeholder="Nome de usuário" error={errors.name?.message} {...form.register('name')} />
        <AuthField label="E-mail" type="email" autoComplete="email" placeholder="Digite seu e-mail" error={errors.email?.message} {...form.register('email')} />
        <PasswordField label="Senha" autoComplete="new-password" placeholder="Senha" error={errors.password?.message} {...form.register('password')} />
        <PasswordField label="Confirmar senha" autoComplete="new-password" placeholder="Confirmar senha" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      </div>
      <FormError message={errors.root?.server?.message} />
      <button type="submit" disabled={mutation.isPending} className={cn(submitClass, 'mt-10 lg:mt-6')}>
        {mutation.isPending ? 'Criando conta…' : (
          <>
            <span className="lg:hidden">Criar perfil</span>
            <span className="hidden lg:inline">Criar conta</span>
          </>
        )}
      </button>
    </form>
  )
}

// Erro que não é de um campo (senha errada, rede caiu): role="alert" é lido na hora.
function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-4 text-center text-sm text-destructive">
      {message}
    </p>
  )
}
