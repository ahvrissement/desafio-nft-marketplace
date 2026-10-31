import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// "Ou continue com" + Google/Facebook. Login social está fora do escopo (não
// há provedor real no mock), então os botões existem como no Figma, mas
// avisam "em breve" em vez de fingir que entram.
export function SocialButtons({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3 text-[13px] text-foreground">
        <span aria-hidden className="h-px flex-1 bg-border" />
        Ou continue com
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <SocialButton label="Continuar com Google" icon={<GoogleIcon />} />
      <SocialButton label="Continuar com Facebook" icon={<FacebookIcon />} />
    </div>
  )
}

function SocialButton({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-disabled="true"
      title="Em breve"
      className="flex h-10 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-[4px] border border-border text-[13px] text-text-secondary lg:mx-auto lg:w-85"
    >
      {icon}
      {label}
      <span className="sr-only"> (em breve)</span>
    </button>
  )
}

// Logos oficiais (cores da marca). aria-hidden: o texto do botão já diz tudo.
function GoogleIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24">
      <path fill="#3B5998" d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.4V14h2.7v8h3.4Z" />
    </svg>
  )
}
