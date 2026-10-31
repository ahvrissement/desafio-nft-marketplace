import { lazy, Suspense } from 'react'

import loginIcon from '@/assets/icons/login.svg'
import { Button } from '@/components/ui/button'

import { firstName } from '../use-auth-success'
import { useAuthDialog } from '../use-auth-dialog'
import { useSession } from '../use-session'

// Sob demanda: visitantes (a maioria na primeira visita) nunca baixam o menu.
const UserMenu = lazy(() => import('./user-menu').then((m) => ({ default: m.UserMenu })))

// Botão "Entrar" do header (desktop). Logado, vira o nome da pessoa com um menu.
export function AccountMenu() {
  const { user, isPending } = useSession()
  const dialog = useAuthDialog()

  // Conferindo o token salvo: reserva o espaço do botão, sem mostrar "Entrar"
  // para logo trocar por "Ana" (o pisca-pisca confunde).
  if (isPending) return <div aria-hidden className="h-8.75 w-25" />

  if (!user) {
    return (
      <Button type="button" onClick={() => dialog.open('entrar')} className="h-8.75 w-25 gap-1 rounded-md px-0 text-base font-medium text-ink">
        <span className="grid size-5 place-items-center">
          <img src={loginIcon} alt="" />
        </span>
        Entrar
      </Button>
    )
  }

  const button = (
    <Button type="button" aria-label={`Conta de ${user.name}`} className="h-8.75 min-w-25 gap-2 rounded-md px-3 text-base font-medium text-ink">
      <Initial name={user.name} />
      {firstName(user.name)}
    </Button>
  )
  // Enquanto o menu carrega, o mesmo botão (sem salto visual)
  return (
    <Suspense fallback={button}>
      <UserMenu name={user.name} email={user.email}>
        {button}
      </UserMenu>
    </Suspense>
  )
}

function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-text-accent">
      {name[0]?.toUpperCase()}
    </span>
  )
}
