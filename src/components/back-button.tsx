import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'

import arrowLeftIcon from '@/assets/icons/arrow-left.svg'
import { MaskIcon } from '@/components/mask-icon'
import { circleButtonClass } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'

// Botão "voltar" dos frames mobile (detalhe, carrinho).
// Acesso direto (link colado, nova aba): não há "voltar" no histórico, então o
// botão leva ao catálogo em vez de tirar a pessoa do site.
export function BackButton({ className }: { className?: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const icon = <MaskIcon src={arrowLeftIcon} width={20} height={20} />

  return canGoBack ? (
    <button type="button" aria-label="Voltar" onClick={() => router.history.back()} className={cn(circleButtonClass, className)}>
      {icon}
    </button>
  ) : (
    <Link to="/" aria-label="Voltar ao catálogo" className={cn(circleButtonClass, className)}>
      {icon}
    </Link>
  )
}
