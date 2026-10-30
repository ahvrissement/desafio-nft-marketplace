import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import type { NftListQueryInput } from '@/contracts/nft'

import { fetchNftFacets, fetchNfts } from './api'

// "Receitas" de query: a chave e a função ficam juntas, num lugar só.
// O componente usa com useQuery(catalogQueries.list(q)) e o loader da rota com
// queryClient.prefetchQuery(catalogQueries.list(q)): mesma chave, mesmo cache.
//
// As chaves são hierárquicas: ['nfts'] → ['nfts', 'list', {...}]. Assim,
// invalidateQueries({ queryKey: catalogQueries.all }) atualiza tudo de NFTs
// de uma vez (útil quando um preço mudar via Socket.IO).
export const catalogQueries = {
  all: ['nfts'] as const,

  list: (query: NftListQueryInput) =>
    queryOptions({
      queryKey: [...catalogQueries.all, 'list', query] as const,
      queryFn: ({ signal }) => fetchNfts(query, signal),
      // Ao trocar de página ou de filtro, mantém os cards antigos na tela até
      // os novos chegarem, em vez de voltar para o skeleton e "piscar".
      placeholderData: keepPreviousData,
    }),

  facets: () =>
    queryOptions({
      queryKey: [...catalogQueries.all, 'facets'] as const,
      queryFn: ({ signal }) => fetchNftFacets(signal),
      staleTime: 5 * 60_000, // contagens da sidebar mudam pouco
    }),
}
