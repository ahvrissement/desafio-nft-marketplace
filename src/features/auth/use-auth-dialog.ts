import { useNavigate } from '@tanstack/react-router'

import type { AuthMode } from './search'

// Quem estava com o foco quando o modal abriu. O Radix só devolve o foco a um
// <DialogTrigger>, e este modal abre pela URL (não tem trigger): sem isto, ao
// fechar, o foco cairia no <body> e quem usa teclado perderia o lugar.
let returnFocusTo: HTMLElement | null = null

export function takeReturnFocus() {
  const element = returnFocusTo
  returnFocusTo = null
  // Depois do login o botão "Entrar" vira o nome da pessoa (outro elemento).
  return element?.isConnected ? element : null
}

// Abre/fecha o modal de login mexendo só no ?auth= da URL atual.
// A página por baixo continua exatamente onde estava (filtros, rolagem...).
export function useAuthDialog() {
  const navigate = useNavigate()

  return {
    open: (mode: AuthMode = 'entrar', redirect?: string) => {
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      void navigate({
        to: '.',
        search: (prev) => ({ ...prev, auth: mode, redirect }),
        hash: (prev) => prev ?? '',
        resetScroll: false,
      })
    },
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
