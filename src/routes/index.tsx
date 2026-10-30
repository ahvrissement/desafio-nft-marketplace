import { createFileRoute } from '@tanstack/react-router'

// Arquivo src/routes/index.tsx  →  rota "/".
// Conteúdo provisório: o catálogo entra no passo 3b, Hero/Promos/Blog no 3c.
export const Route = createFileRoute('/')({
  staticData: { mobileTab: 'home' },
  component: HomePage,
})

function HomePage() {
  return (
    <div className="page-container flex flex-col gap-6 pt-8">
      <h1 className="text-4xl font-bold">Kurio</h1>
      {/* Âncora do item "Mercado" do Header */}
      <section id="mercado" aria-label="Mercado" className="min-h-96 rounded-lg border border-dashed p-6 text-text-secondary">
        Catálogo (passo 3b)
      </section>
    </div>
  )
}
