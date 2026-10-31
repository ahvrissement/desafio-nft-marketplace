import { useQuery } from '@tanstack/react-query'

import { NftCarousel } from '@/features/catalog/components/nft-carousel'

import { nftQueries } from '../queries'

export function RelatedNfts({ nftId }: { nftId: string }) {
  const { data, isPending, isError } = useQuery(nftQueries.related(nftId))
  return <NftCarousel title="Mais desta coleção" items={isError ? [] : data} isPending={isPending} />
}
