import { queryOptions } from '@tanstack/react-query'

import { catalogQueries } from '@/features/catalog/queries'

import { fetchNft, fetchNftReviews, fetchRelatedNfts } from './api'

// Tudo debaixo de ['nfts']: um `nft.updated` do Socket.IO invalida catálogo,
// destaque e detalhe de uma vez só.
export const nftQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: [...catalogQueries.all, 'detail', id] as const,
      queryFn: ({ signal }) => fetchNft(id, signal),
    }),

  reviews: (id: string) =>
    queryOptions({
      queryKey: [...nftQueries.detail(id).queryKey, 'reviews'] as const,
      queryFn: ({ signal }) => fetchNftReviews(id, signal),
      staleTime: 5 * 60_000, // avaliações mudam pouco
    }),

  related: (id: string) =>
    queryOptions({
      queryKey: [...nftQueries.detail(id).queryKey, 'related'] as const,
      queryFn: ({ signal }) => fetchRelatedNfts(id, signal),
    }),
}
