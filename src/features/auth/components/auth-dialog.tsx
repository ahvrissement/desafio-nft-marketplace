import { useSearch } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import closeIcon from '@/assets/icons/close.svg'
import { MaskIcon } from '@/components/mask-icon'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import type { AuthMode } from '../search'
import { takeReturnFocus, useAuthDialog } from '../use-auth-dialog'
import { LoginForm, SignupForm } from './auth-forms'
import { SocialButtons } from './social-buttons'

const COPY: Record<AuthMode, { title: string; mobileTitle: string; description: string }> = {
  entrar: {
    title: 'Entrar',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  cadastro: {
    title: 'Criar conta',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

// Login/cadastro do Figma: modal por cima da página no desktop, tela cheia no
// mobile. Quem abre é o ?auth= da URL (veja use-auth-dialog.ts).
// O Dialog do Radix cuida de: foco preso dentro, Esc fecha, fundo inerte e
// foco devolvido ao botão "Entrar" ao fechar.
export function AuthDialog() {
  const { auth: mode } = useSearch({ strict: false })
  const dialog = useAuthDialog()
  const contentRef = useRef<HTMLDivElement>(null)
  // Durante a animação de saída o modo some da URL; guardamos o último para o
  // conteúdo não "piscar" vazio enquanto o modal fecha. É estado (não ref):
  // "ajustar o estado durante o render" é o padrão do React para isso.
  const [lastMode, setLastMode] = useState<AuthMode>('entrar')
  if (mode && mode !== lastMode) setLastMode(mode)
  const current = mode ?? lastMode
  const copy = COPY[current]

  return (
    <Dialog open={Boolean(mode)} onOpenChange={(open) => !open && dialog.close()}>
      <DialogContent
        ref={contentRef}
        showCloseButton={false}
        // Abre já com o foco no primeiro campo, pronto para digitar.
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          contentRef.current?.querySelector('input')?.focus()
        }}
        // Ao fechar: foco de volta em quem abriu (ex.: o botão "Entrar").
        onCloseAutoFocus={(event) => {
          const target = takeReturnFocus()
          if (target) {
            event.preventDefault()
            target.focus()
          }
        }}
        className={cn(
          'block gap-0 overflow-y-auto p-0 ring-0',
          // Mobile: tela cheia, fundo da página
          'inset-0 h-dvh max-w-none translate-x-0 translate-y-0 rounded-none bg-background px-7 pt-20 pb-10',
          // Desktop: o modal de 500px do Figma, com a faixa laranja embaixo
          'lg:inset-auto lg:top-40 lg:left-1/2 lg:h-auto lg:max-h-[calc(100dvh-11rem)] lg:w-125 lg:max-w-125 lg:-translate-x-1/2 lg:rounded-none lg:bg-card lg:px-0 lg:pt-12 lg:pb-0',
        )}
      >
        <DialogClose
          aria-label="Fechar"
          className="absolute top-3 right-3 grid size-10 place-items-center text-text-accent hover:text-foreground"
        >
          <MaskIcon src={closeIcon} width={18} height={18} />
        </DialogClose>

        {/* Mobile: logo + título */}
        <p aria-hidden className="flex h-34 items-center justify-center text-[36px] leading-10.5 font-bold tracking-wider lg:hidden">
          KURIO
        </p>
        <DialogTitle className="mt-10 text-center text-lg leading-4 font-bold lg:sr-only">{copy.mobileTitle}</DialogTitle>

        {/* Desktop: "Entrar | Criar conta" */}
        <div className="hidden items-center justify-center gap-2 text-xl leading-5 font-medium lg:flex">
          <ModeButton mode="entrar" current={current} onSelect={dialog.switchTo} />
          <span aria-hidden className="h-5 w-px bg-primary" />
          <ModeButton mode="cadastro" current={current} onSelect={dialog.switchTo} />
        </div>
        {/* max-lg:sr-only (e não sr-only + lg:not-sr-only): o not-sr-only zera as
            margens e o texto colava nas abas. */}
        <DialogDescription className="mx-12 mt-10 text-center text-[13px] leading-4 text-foreground max-lg:sr-only">
          {copy.description}
        </DialogDescription>

        <div className="mt-10 lg:mt-6 lg:px-20">
          {/* key: trocar de modo monta um formulário novo, sem restos do outro */}
          {current === 'entrar' ? <LoginForm key="entrar" /> : <SignupForm key="cadastro" />}
        </div>

        <SocialButtons className="mt-10 lg:mt-6" />

        {/* Mobile: alternar entre os modos pelo link do rodapé */}
        <p className="mt-10 text-center text-[15px] text-text-secondary lg:hidden">
          {current === 'entrar' ? 'Novo na Kurio? ' : 'Já tem uma conta? '}
          <button type="button" onClick={() => dialog.switchTo(current === 'entrar' ? 'cadastro' : 'entrar')} className="underline-offset-4 hover:text-text-accent hover:underline">
            {current === 'entrar' ? 'Crie uma conta' : 'Entre'}
          </button>
        </p>

        <div aria-hidden className="mt-6 hidden h-2.5 bg-primary lg:block" />
      </DialogContent>
    </Dialog>
  )
}

function ModeButton({ mode, current, onSelect }: { mode: AuthMode; current: AuthMode; onSelect: (mode: AuthMode) => void }) {
  const active = mode === current
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={cn(active ? 'text-text-accent' : 'text-foreground hover:text-text-accent')}
    >
      {COPY[mode].title}
    </button>
  )
}
