import { Button } from '@/components/ui/button'

// Tela provisória: só serve para conferir se Tailwind + shadcn + tokens do Figma
// estão funcionando. Ela será substituída pelo TanStack Router no passo 4.
export default function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-4xl font-bold">Kurio</h1>
      <p className="text-text-secondary">
        Setup ok: Vite + React + TypeScript + Tailwind v4 + shadcn/ui.
      </p>

      <div className="rounded-lg border bg-card p-6">
        <p className="text-text-accent">1.19 ETH</p>
        <p className="text-muted-foreground">Emerald Ape #042</p>
      </div>

      <div className="flex gap-3">
        <Button>Explorar</Button>
        <Button variant="outline">Entrar</Button>
      </div>
    </main>
  )
}
