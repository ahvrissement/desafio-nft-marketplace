import {
  nftFacetsSchema,
  nftListResponseSchema,
  type NftListQueryInput,
} from '@/contracts/nft'
import { request } from '@/lib/http'

// O `signal` vem do React Query. Quando a chave muda (o usuário digitou mais
// uma letra), ele aborta a requisição antiga, e a resposta velha nunca chega a
// sobrescrever a nova (sem race condition).
export function fetchNfts(query: NftListQueryInput, signal?: AbortSignal) {
  return request(nftListResponseSchema, { url: '/nfts', params: query, signal })
}

export function fetchNftFacets(signal?: AbortSignal) {
  return request(nftFacetsSchema, { url: '/nfts/facets', signal })
}
