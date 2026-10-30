export type PageItem = number | 'gap'

// Quais números mostrar na paginação. Até 7 páginas, todas.
// Mais que isso: primeira, última, a atual e suas vizinhas, com "…" nos buracos.
//   pageWindow(5, 12) → [1, 'gap', 4, 5, 6, 'gap', 12]
export function pageWindow(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  const items: PageItem[] = []
  for (const page of sorted) {
    const previous = items.at(-1)
    if (typeof previous === 'number' && page - previous > 1) items.push('gap')
    items.push(page)
  }
  return items
}
