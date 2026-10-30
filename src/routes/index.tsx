import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

// Arquivo src/routes/index.tsx  →  rota "/".
// Tela provisória: será substituída pela Home de verdade.
export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-4xl font-bold">Kurio</h1>
      <p className="text-text-secondary">Router + Query funcionando.</p>
      <div className="flex gap-3">
        <Button>Explorar</Button>
        <Button variant="outline">Entrar</Button>
      </div>
    </main>
  )
}
