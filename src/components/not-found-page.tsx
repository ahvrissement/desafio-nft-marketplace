import { Link } from '@tanstack/react-router'

// Página para qualquer endereço que não corresponde a uma rota (ex.: /qualquer-coisa).
// O router renderiza dentro do layout raiz: header, footer e navegação continuam.
export function NotFoundPage() {
  return (
    <div className="page-container flex flex-col items-start gap-4 py-16 lg:py-24">
      <title>Página não encontrada | Kurio</title>
      <p className="text-sm font-bold text-text-accent uppercase">Erro 404</p>
      <h1 className="text-2xl font-bold lg:text-[28px]">Página não encontrada</h1>
      <p className="max-w-xl text-text-secondary">O endereço que você acessou não existe.</p>
      <Link to="/" className="mt-2 rounded-[5px] bg-primary px-6 py-3 font-bold text-ink hover:bg-text-accent">
        Voltar ao início
      </Link>
    </div>
  )
}
