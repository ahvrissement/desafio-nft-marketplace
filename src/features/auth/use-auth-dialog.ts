import { useNavigate } from '@tanstack/react-router'

import type { AuthMode } from './search'

// Abre/fecha o modal de login mexendo só no ?auth= da URL atual.
// A página por baixo continua exatamente onde estava (filtros, rolagem...).
export function useAuthDialog() {
  const navigate = useNavigate()

  return {
    open: (mode: AuthMode = 'entrar', redirect?: string) =>
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, auth: mode, redirect }),
        hash: (prev) => prev ?? '',
        resetScroll: false,
      }),
    // replace: trocar entre "Entrar" e "Criar conta" não cria entradas no histórico
    switchTo: (mode: AuthMode) =>
      void navigate({ to: '.', search: (prev) => ({ ...prev, auth: mode }), replace: true, resetScroll: false }),
    close: () =>
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, auth: undefined, redirect: undefined }),
        replace: true,
        resetScroll: false,
      }),
  }
}
