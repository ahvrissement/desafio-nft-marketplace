import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Item do Figma que está FORA do escopo do desafio (Criadores, Aprenda, links de ajuda...).
// O README exige que ações fora do escopo "não aparentem sucesso funcional":
// mantemos o visual do Figma, mas não é um link, não leva a uma página vazia
// e o leitor de tela ouve "(em breve)".
export function ComingSoon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className={cn('cursor-not-allowed', className)}>
      {children}
      <span className="sr-only"> (em breve)</span>
    </span>
  )
}
