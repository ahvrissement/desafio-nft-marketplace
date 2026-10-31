import type { ReactNode } from 'react'

import { useAuthDialog } from '../use-auth-dialog'
import { useSession } from '../use-session'
import { UserMenu } from './account-menu'

// Item "Perfil" da barra inferior do mobile: visitante → abre o login;
// logado → menu da conta (a página de perfil entra no passo das carteiras).
export function MobileAccountButton({ children, className }: { children: ReactNode; className: string }) {
  const { user } = useSession()
  const dialog = useAuthDialog()

  if (!user) {
    return (
      <button type="button" aria-label="Entrar" onClick={() => dialog.open('entrar')} className={className}>
        {children}
      </button>
    )
  }
  return (
    <UserMenu name={user.name} email={user.email}>
      <button type="button" aria-label={`Conta de ${user.name}`} className={className}>
        {children}
      </button>
    </UserMenu>
  )
}
