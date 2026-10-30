import { useCallback, useEffect, useRef } from 'react'

// Devolve uma versão "atrasada" da função: ela só roda depois que as chamadas
// param por `delay` ms. Digitar "emerald" chama 7 vezes, mas executa 1.
export function useDebouncedCallback<Args extends unknown[]>(callback: (...args: Args) => void, delay: number) {
  // Guardamos a função mais recente numa ref para o timer nunca chamar uma
  // versão antiga dela (com valores de props/estado desatualizados).
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  const timerRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timerRef.current), []) // limpa ao desmontar

  return useCallback(
    (...args: Args) => {
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => callbackRef.current(...args), delay)
    },
    [delay],
  )
}
