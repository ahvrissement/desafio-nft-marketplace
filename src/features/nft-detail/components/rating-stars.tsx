import starIcon from '@/assets/icons/star.svg'
import { MaskIcon } from '@/components/mask-icon'
import { cn } from '@/lib/utils'

import { formatRating } from '../format'

// 5 estrelas com preenchimento parcial (4,8 = 4 cheias + 80% da quinta).
// Para o leitor de tela, o grupo vira UMA imagem com o texto "Nota 4,8 de 5":
// ler "estrela, estrela, estrela..." não informaria nada.
export function RatingStars({ rating, size = 15, className }: { rating: number; size?: number; className?: string }) {
  return (
    <span role="img" aria-label={`Nota ${formatRating(rating)} de 5`} className={cn('flex gap-1', className)}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, rating - index)) // 0 a 1
        return (
          <span key={index} className="relative" style={{ width: size, height: size }}>
            <MaskIcon src={starIcon} width={size} height={size} className="absolute inset-0 text-text-secondary" />
            {/* A parte laranja é a mesma estrela, cortada na largura da nota */}
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <MaskIcon src={starIcon} width={size} height={size} className="text-primary" />
            </span>
          </span>
        )
      })}
    </span>
  )
}
