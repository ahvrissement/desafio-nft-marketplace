import { Link, createFileRoute } from '@tanstack/react-router'

// Arquivo src/routes/nft/$id.tsx  →  rota "/nft/:id". O "$" marca o parâmetro dinâmico.
// Provisória: a página de detalhe é o passo 4. Ela já existe para os links
// dos cards serem tipados (<Link to="/nft/$id" params={{ id }}>).
export const Route = createFileRoute('/nft/$id')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { id } = Route.useParams()
  return (
    <div className="page-container flex flex-col gap-4 pt-8">
      <h1 className="text-2xl font-bold">NFT: {id}</h1>
      <p className="text-text-secondary">A página de detalhe é construída no passo 4.</p>
      <Link to="/" className="text-text-accent underline">
        Voltar ao catálogo
      </Link>
    </div>
  )
}
