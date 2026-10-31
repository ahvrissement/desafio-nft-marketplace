import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PasswordTextField, TextField } from '@/components/form-fields'
import type { User } from '@/contracts/auth'
import { changePasswordInputSchema, updateProfileInputSchema, type Profile, type UpdateProfileInput } from '@/contracts/profile'
import { applyServerErrors } from '@/features/auth/server-errors'
import { useSession } from '@/features/auth/use-session'

import { changePassword, imageToAvatar, removeAvatar, updateAvatar, updateProfile } from '../api'
import { applyProfile, profileQueries } from '../queries'

export function ProfilePage() {
  const { user, isPending } = useSession()
  if (!isPending && !user) return <Navigate to="/" replace /> // saiu da conta aqui dentro
  if (!user) return null
  return <ProfileLoader user={user} />
}

function ProfileLoader({ user }: { user: User }) {
  const { data: profile, isPending, isError, refetch } = useQuery(profileQueries.profile(user.id))
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3">
        <p>Não foi possível carregar seu perfil.</p>
        <button type="button" onClick={() => void refetch()} className="font-bold text-text-accent underline">Tentar de novo</button>
      </div>
    )
  }
  if (isPending) return <div aria-busy="true" className="h-120 rounded-sm skeleton-shimmer" />
  return (
    <>
      <title>Meu perfil | Kurio</title>
      <h1 className="sr-only">Meu perfil</h1>
      <ProfileForm userId={user.id} profile={profile} />
      <PasswordForm />
    </>
  )
}

function ProfileForm({ userId, profile }: { userId: string; profile: Profile }) {
  const queryClient = useQueryClient()
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileInputSchema),
    defaultValues: {
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName,
      walletNickname: profile.walletNickname,
    },
  })
  const { errors, isDirty } = form.formState
  const save = useMutation({
    mutationFn: updateProfile,
    onSuccess: (next) => {
      applyProfile(queryClient, userId, next)
      form.reset(form.getValues()) // o salvo vira o novo "original"
      toast.success('Perfil atualizado.')
    },
    // 409 (e-mail/usuário em uso) e 400 (campo inválido) vão para o campo certo.
    onError: (error) => applyServerErrors(error, form.setError, ['displayName', 'username', 'email', 'ensName', 'walletNickname']),
  })

  return (
    <section aria-labelledby="perfil-titulo">
      <h2 id="perfil-titulo" className="mb-6 text-lg font-bold">Perfil do colecionador</h2>
      <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required autoComplete="name" error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Nome de usuário" required autoComplete="username" error={errors.username?.message} {...form.register('username')} />
        <TextField label="E-mail" required type="email" autoComplete="email" error={errors.email?.message} {...form.register('email')} />
        <TextField label="Nome ENS" required hint="Sem o .eth (ele é adicionado sozinho)." error={errors.ensName?.message} {...form.register('ensName')} />
        <TextField label="Apelido da carteira" required error={errors.walletNickname?.message} {...form.register('walletNickname')} />
        <AvatarField userId={userId} avatarUrl={profile.avatarUrl} name={profile.displayName} />
        {errors.root?.server && (
          <p role="alert" className="text-sm text-destructive md:col-span-2">{errors.root.server.message}</p>
        )}
        <div className="md:col-span-2">
          <button type="submit" disabled={save.isPending || !isDirty} className="h-10 w-32.5 rounded-[4px] bg-primary font-bold text-ink disabled:opacity-50">
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </section>
  )
}

// Avatar: "Alterar" abre o seletor de arquivo; a imagem é reduzida para 128px
// no navegador antes de ir para a API. "Remover" volta para o ícone padrão.
function AvatarField({ userId, avatarUrl, name }: { userId: string; avatarUrl: string | null; name: string }) {
  const queryClient = useQueryClient()
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)
  const onSaved = (profile: Profile, message: string) => {
    applyProfile(queryClient, userId, profile)
    setError(null)
    toast.success(message)
  }
  const upload = useMutation({
    mutationFn: async (file: File) => updateAvatar(await imageToAvatar(file)),
    onSuccess: (profile) => onSaved(profile, 'Avatar atualizado.'),
    onError: (failure) => setError(failure.message),
  })
  const remove = useMutation({ mutationFn: removeAvatar, onSuccess: (profile) => onSaved(profile, 'Avatar removido.') })

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px]">Avatar</span>
      <div className="flex items-center gap-6">
        {avatarUrl ? (
          <img src={avatarUrl} alt={`Avatar de ${name}`} width={50} height={50} className="size-12.5 rounded-full object-cover" />
        ) : (
          <span aria-label="Sem avatar" role="img" className="grid size-12.5 place-items-center rounded-full border border-border bg-surface-raised text-lg font-bold text-text-accent">
            {name[0]?.toUpperCase()}
          </span>
        )}
        {/* <label> estilizado como botão: abre o seletor de arquivo do sistema */}
        <label htmlFor={inputId} className="grid h-10 cursor-pointer place-items-center rounded-[4px] bg-primary px-6 font-bold text-ink has-focus-visible:outline-2 has-focus-visible:outline-ring">
          {upload.isPending ? 'Enviando…' : 'Alterar'}
          <input
            id={inputId}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-describedby={error ? `${inputId}-erro` : undefined}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) upload.mutate(file)
              event.target.value = '' // permite escolher o mesmo arquivo de novo
            }}
          />
        </label>
        {avatarUrl && (
          <button type="button" disabled={remove.isPending} onClick={() => remove.mutate()} className="text-[15px] hover:text-text-accent">
            Remover
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-erro`} role="alert" className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

const passwordFormSchema = changePasswordInputSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirme a nova senha.') })
  .refine((values) => values.newPassword === values.confirmPassword, { message: 'As senhas não conferem.', path: ['confirmPassword'] })
type PasswordForm = z.input<typeof passwordFormSchema>

function PasswordForm() {
  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState
  const save = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      form.reset()
      toast.success('Senha alterada.')
    },
    onError: (error) => applyServerErrors(error, form.setError, ['currentPassword', 'newPassword']),
  })

  return (
    <section aria-labelledby="senha-titulo" className="mt-10 max-w-104.5">
      <h2 id="senha-titulo" className="mb-4 text-lg font-bold">Alterar senha</h2>
      <form
        noValidate
        onSubmit={form.handleSubmit(({ currentPassword, newPassword }) => save.mutate({ currentPassword, newPassword }))}
        className="flex flex-col gap-5"
      >
        <PasswordTextField label="Senha atual" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <PasswordTextField label="Nova senha" autoComplete="new-password" error={errors.newPassword?.message} {...form.register('newPassword')} />
        <PasswordTextField label="Confirmar nova senha" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        {errors.root?.server && <p role="alert" className="text-sm text-destructive">{errors.root.server.message}</p>}
        <button type="submit" disabled={save.isPending} className="h-10 w-40 rounded-[4px] bg-primary font-bold text-ink disabled:opacity-50">
          {save.isPending ? 'Alterando…' : 'Alterar senha'}
        </button>
      </form>
    </section>
  )
}
