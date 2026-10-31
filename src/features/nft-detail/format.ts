import type { NftEdition } from '@/contracts/nft'

const ratingFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatRating(rating: number) {
  return ratingFormat.format(rating) // 4.8 → "4,8"
}

// "Restam 12 de 50" / "Esgotada" / "Tiragem aberta". O Figma não mostra o
// estoque, mas o README pede tratar edição indisponível e limite de quantidade:
// sem esse texto, o usuário não saberia por que o "+" parou.
export function editionAvailabilityText(edition: NftEdition) {
  if (edition.available === null) return 'Tiragem aberta, sem limite de estoque.'
  if (edition.available === 0) return 'Esta edição está esgotada.'
  return `Restam ${edition.available} de ${edition.supply} nesta edição.`
}
