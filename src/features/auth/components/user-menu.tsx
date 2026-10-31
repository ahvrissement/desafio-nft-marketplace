import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useLogout } from '../use-logout'

// Menu da conta (Radix DropdownMenu). Arquivo próprio: só quem está logado
// precisa dele, então fica fora do JavaScript da primeira pintura.
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
          <Link to="/favorites">Meus favoritos</Link>
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
