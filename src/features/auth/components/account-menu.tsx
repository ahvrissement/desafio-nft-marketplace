import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import loginIcon from '@/assets/icons/login.svg'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { firstName } from '../use-auth-success'
import { useAuthDialog } from '../use-auth-dialog'
import { useLogout } from '../use-logout'
import { useSession } from '../use-session'

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

  return (
    <UserMenu name={user.name} email={user.email}>
      <Button type="button" aria-label={`Conta de ${user.name}`} className="h-8.75 min-w-25 gap-2 rounded-md px-3 text-base font-medium text-ink">
        <Initial name={user.name} />
        {firstName(user.name)}
      </Button>
    </UserMenu>
  )
}

// Menu da conta, reaproveitado pelo item "Perfil" da barra inferior do mobile.
export function UserMenu({ name, email, children }: { name: string; email: string; children: ReactNode }) {
  const logoutMutation = useLogout()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground">{name}</span>
          <span className="truncate text-xs font-normal text-text-subtle">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">Meu perfil</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile/wallets">Carteiras</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logoutMutation.isPending} onSelect={() => logoutMutation.mutate()} className="font-bold text-text-accent">
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Initial({ name }: { name: string }) {
  return (
    <span aria-hidden className="grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold text-text-accent">
      {name[0]?.toUpperCase()}
    </span>
  )
}
