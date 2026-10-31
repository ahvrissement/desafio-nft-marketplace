import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { NftDetail } from '@/features/nft-detail/components/nft-detail'
import { NftDetailSkeleton, NftLoadError, NftNotFound } from '@/features/nft-detail/components/nft-detail-states'
import { nftQueries } from '@/features/nft-detail/queries'

// ?edition=1-10. `.catch(undefined)`: valor quebrado na URL é ignorado (vale a
// edição padrão) em vez de derrubar a página. Se o id não existir no NFT, o
// componente também cai na padrão.
const nftSearchSchema = z.object({
  edition: z.string().optional().catch(undefined),
})

// Arquivo src/routes/nft/$id.tsx  →  rota "/nft/:id". O "$" marca o parâmetro dinâmico.
export const Route = createFileRoute('/nft/$id')({
  validateSearch: nftSearchSchema,
  // Mesmo padrão da Home: começa a buscar já (até no hover do card, pelo
  // preload), mas não segura a tela. Quem acessa direto vê o skeleton.
  loader: ({ context: { queryClient }, params: { id } }) => {
    void queryClient.prefetchQuery(nftQueries.detail(id))
    void queryClient.prefetchQuery(nftQueries.related(id))
  },
  staticData: { mobileBuyBar: true },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { id } = Route.useParams()
  const { data: nft, isPending, isError, error, refetch } = useQuery(nftQueries.detail(id))

  if (isPending) return <NftDetailSkeleton />
  // 404 é uma resposta DEFINITIVA (o retry do query-client nem tenta de novo):
  // mostramos "não encontrado". Outros erros podem ser passageiros: "tentar de novo".
  if (isError) return error.code === 'NOT_FOUND' ? <NftNotFound /> : <NftLoadError onRetry={() => void refetch()} />

  // key={nft.id}: ao ir de um NFT para outro ("Mais desta coleção"), o React
  // monta a página do zero e o estado local (quantidade, imagem ativa) não vaza.
  return <NftDetail key={nft.id} nft={nft} />
}
