import { useRef, type TouchEvent } from 'react'

const SWIPE_THRESHOLD = 40 // px de arrasto horizontal para contar como "swipe"

// Detecta arrasto horizontal no toque (carrosséis do mobile).
// Devolve os handlers para espalhar no elemento: <div {...useSwipe(...)}>.
// Um toque parado (sem arrastar) não dispara nada, então links e botões
// dentro do elemento continuam funcionando normalmente.
export function useSwipe({ onNext, onPrevious }: { onNext: () => void; onPrevious: () => void }) {
  const startX = useRef<number | null>(null)

  return {
    onTouchStart: (event: TouchEvent) => {
      startX.current = event.touches[0].clientX
    },
    onTouchEnd: (event: TouchEvent) => {
      if (startX.current === null) return
      const deltaX = event.changedTouches[0].clientX - startX.current
      startX.current = null
      if (Math.abs(deltaX) < SWIPE_THRESHOLD) return
      // Dedo para a esquerda = próximo (como virar a página)
      if (deltaX < 0) onNext()
      else onPrevious()
    },
  }
}
