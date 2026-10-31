import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { useAuthDialog } from '../use-auth-dialog'
import { useSession } from '../use-session'

// Item "Perfil" da barra inferior do mobile: visitante → abre o login;
// logado → página "Meu perfil" (onde também fica o "Sair").
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
    <Link to="/profile" aria-label={`Perfil de ${user.name}`} className={className}>
      {children}
    </Link>
  )
}
