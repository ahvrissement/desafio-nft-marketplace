import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCart } from '@/features/cart/use-cart'
import { clearToken } from '@/features/auth/token-store'
import { http } from '@/lib/http'
import { addEth, percentOfEth } from '@/lib/money'
import { cn } from '@/lib/utils'

// Painel de cenários do mock (README: cenários "configuráveis e reproduzíveis").
// Só existe com o MSW ligado. Tudo passa pelas rotas /api/__dev do mock:
// o painel não mexe no cache nem finge respostas; ele muda o BACKEND falso,
// e o app reage como reagiria a um backend real.

interface Scenarios {
  latency: 'normal' | 'slow' | 'variable'
  failure: 'none' | 'offline' | 'server-error' | 'unavailable' | 'timeout'
  walletConnect: 'approve' | 'decline'
  payment: 'confirm' | 'decline'
  orderTimeout: boolean
}

const scenariosKey = ['__dev', 'scenarios'] as const

export default function ScenariosPanel() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const { data: scenarios } = useQuery({
    queryKey: scenariosKey,
    queryFn: async () => (await http.get<Scenarios>('/__dev/scenarios')).data,
    staleTime: Infinity,
  })
  const { data: cart } = useCart()
  const firstItem = cart?.items[0]

  const update = useMutation({
    mutationFn: async (patch: Partial<Scenarios>) => (await http.put<Scenarios>('/__dev/scenarios', patch)).data,
    // Otimista: o rádio marca no clique, sem esperar a resposta do mock.
    onMutate: (patch) => {
      queryClient.setQueryData<Scenarios>(scenariosKey, (current) => current && { ...current, ...patch })
    },
    onSuccess: (next) => {
      queryClient.setQueryData(scenariosKey, next)
      setStatus('Cenário atualizado.')
    },
  })

  const action = (label: string, run: () => Promise<unknown>) => async () => {
    try {
      await run()
      setStatus(`${label}: feito.`)
    } catch {
      setStatus(`${label}: não foi possível.`)
    }
  }

  const changePrice = action('Preço do 1º item +10%', async () => {
    if (!firstItem) throw new Error('carrinho vazio')
    const price = addEth(firstItem.unitPrice, percentOfEth(firstItem.unitPrice, 1_000))
    await http.post('/__dev/nft-update', { nftId: firstItem.nftId, editionId: firstItem.editionId, price })
  })
  const soldOut = action('Esgotar 1º item', async () => {
    if (!firstItem) throw new Error('carrinho vazio')
    await http.post('/__dev/nft-update', { nftId: firstItem.nftId, editionId: firstItem.editionId, available: 0 })
  })
  const realtime = (kind: 'duplicate' | 'stale' | 'disconnect', label: string) =>
    action(label, () => http.post('/__dev/realtime', { action: kind }))

  // Reset INTEGRAL: banco do mock, sessão, carrinho de visitante, tentativa de
  // compra e cache. Recarrega a página para começar do zero.
  const reset = action('Reset', async () => {
    await http.post('/__dev/reset')
    clearToken()
    for (const key of ['kurio:guest-cart']) localStorage.removeItem(key)
    sessionStorage.removeItem('kurio:checkout-attempt')
    queryClient.clear()
    window.location.assign('/')
  })

  if (!scenarios) return null
  const set = (patch: Partial<Scenarios>) => update.mutate(patch)
  const active = scenarios.latency !== 'normal' || scenarios.failure !== 'none' || scenarios.walletConnect !== 'approve' || scenarios.payment !== 'confirm' || scenarios.orderTimeout

  return (
    <Sheet>
      {/* Celular: só um círculo com ícone (o texto cobria os cards). O nome
          "Cenários" continua para o leitor de tela (sr-only até o lg). */}
      <SheetTrigger className="fixed bottom-48 left-3 z-30 grid size-9 place-items-center rounded-full border border-primary bg-card text-xs font-bold text-text-accent shadow-lg lg:bottom-4 lg:left-4 lg:flex lg:h-9 lg:w-auto lg:items-center lg:gap-2 lg:px-3">
        <span
          aria-hidden
          className={cn(
            'absolute top-0.5 right-0.5 size-2 rounded-full lg:static',
            active ? 'bg-destructive' : 'bg-emerald-400',
          )}
        />
        <FlaskConical aria-hidden className="size-4 lg:hidden" />
        <span className="max-lg:sr-only">Cenários</span>
        {active && <span className="sr-only"> (há cenários ativos)</span>}
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(92vw,380px)] gap-0 overflow-y-auto bg-card p-5">
        <SheetHeader className="mb-4 p-0">
          <SheetTitle>Cenários do mock</SheetTitle>
          <SheetDescription>Mudam o backend simulado (MSW). Ficam salvos até o reset.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 text-sm">
          <Choice
            legend="Latência"
            value={scenarios.latency}
            onChange={(latency) => set({ latency })}
            options={[
              ['normal', 'Normal (0,1–0,4s)'],
              ['slow', 'Lenta (2,5s)'],
              ['variable', 'Variável (0,1–3s, fora de ordem)'],
            ]}
          />
          <Choice
            legend="Falha de rede/HTTP"
            value={scenarios.failure}
            onChange={(failure) => set({ failure })}
            options={[
              ['none', 'Nenhuma'],
              ['offline', 'Sem conexão'],
              ['server-error', 'Erro 500'],
              ['unavailable', 'Erro 503 (indisponível)'],
              ['timeout', 'Timeout (12s)'],
            ]}
          />
          <Choice
            legend="Carteira"
            value={scenarios.walletConnect}
            onChange={(walletConnect) => set({ walletConnect })}
            options={[
              ['approve', 'Aprova a conexão'],
              ['decline', 'Recusa a conexão'],
            ]}
          />
          <Choice
            legend="Pagamento"
            value={scenarios.payment}
            onChange={(payment) => set({ payment })}
            options={[
              ['confirm', 'Confirmado'],
              ['decline', 'Recusado'],
            ]}
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={scenarios.orderTimeout} onChange={(event) => set({ orderTimeout: event.target.checked })} className="size-4 accent-primary" />
            Timeout depois de criar o pedido
          </label>

          <Group legend="Catálogo (dispara nft.updated)">
            <ActionButton disabled={!firstItem} onClick={changePrice}>Subir 10% o preço do 1º item do carrinho</ActionButton>
            <ActionButton disabled={!firstItem} onClick={soldOut}>Esgotar o 1º item do carrinho</ActionButton>
            {!firstItem && <p className="text-xs text-text-subtle">Adicione um item ao carrinho para usar.</p>}
          </Group>

          <Group legend="Sessão e tempo real">
            <ActionButton onClick={action('Expirar sessão', () => http.post('/__dev/expire-sessions'))}>Expirar a sessão agora</ActionButton>
            <ActionButton onClick={realtime('duplicate', 'Evento duplicado')}>Reenviar o último evento (duplicata)</ActionButton>
            <ActionButton onClick={realtime('stale', 'Evento antigo')}>Enviar o último evento com versão antiga</ActionButton>
            <ActionButton onClick={realtime('disconnect', 'Desconectar')}>Derrubar a conexão Socket.IO</ActionButton>
          </Group>

          <button type="button" onClick={reset} className="h-10 rounded-[4px] bg-destructive font-bold text-ink">
            Reset completo (cenário padrão)
          </button>
          <p role="status" className="min-h-5 text-xs text-text-secondary">
            {status}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Choice<T extends string>({ legend, value, onChange, options }: { legend: string; value: T; onChange: (value: T) => void; options: [T, string][] }) {
  // Escolha local e SÍNCRONA: o rádio marca no mesmo clique. (O otimista do
  // React Query roda no microtask seguinte, e um rádio controlado "piscaria".)
  const [selected, setSelected] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setSelected(value)
  }
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 font-bold">{legend}</legend>
      {options.map(([option, label]) => (
        <label key={option} className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={legend}
            checked={selected === option}
            onChange={() => {
              setSelected(option)
              onChange(option)
            }}
            className="size-4 accent-primary"
          />
          {label}
        </label>
      ))}
    </fieldset>
  )
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={legend} className="flex flex-col gap-2">
      <p className="font-bold">{legend}</p>
      {children}
    </div>
  )
}

function ActionButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="rounded-[4px] border border-border px-3 py-2 text-left hover:border-primary disabled:opacity-50">
      {children}
    </button>
  )
}
