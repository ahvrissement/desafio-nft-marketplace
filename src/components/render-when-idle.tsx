import { startTransition, useEffect, useState, type ReactNode } from 'react'

// Monta o conteúdo só quando o navegador fica ocioso, DEPOIS da primeira
// pintura. Serve para o que está abaixo da dobra (Promos, Blog, rodapé): a
// tela aparece antes, e esse trabalho deixa de atrasar a primeira pintura.
//
// Sem CLS: o conteúdo entra embaixo do que já está na tela (nada se move).
// startTransition: a montagem é feita em fatias, sem travar a página.
// timeout: mesmo se o navegador nunca ficar ocioso, monta em até 1,5s.
export function RenderWhenIdle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const show = () => startTransition(() => setReady(true))
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(show, { timeout: 1_500 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(show, 200) // Safari: sem requestIdleCallback
    return () => clearTimeout(id)
  }, [])

  return ready ? children : null
}
