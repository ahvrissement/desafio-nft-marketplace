import { nftRelatedResponseSchema, nftReviewsResponseSchema, nftSchema } from '@/contracts/nft'
import { request } from '@/lib/http'

// encodeURIComponent: o id vem da URL, que o usuário pode digitar à vontade.
const path = (id: string) => `/nfts/${encodeURIComponent(id)}`

export function fetchNft(id: string, signal?: AbortSignal) {
  return request(nftSchema, { url: path(id), signal })
}

export async function fetchNftReviews(id: string, signal?: AbortSignal) {
  const { items } = await request(nftReviewsResponseSchema, { url: `${path(id)}/reviews`, signal })
  return items
}

export async function fetchRelatedNfts(id: string, signal?: AbortSignal) {
  const { items } = await request(nftRelatedResponseSchema, { url: `${path(id)}/related`, signal })
  return items
}
