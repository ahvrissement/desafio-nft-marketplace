import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { toast } from 'sonner'

import type { Cart } from '@/contracts/cart'
import type { Nft } from '@/contracts/nft'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  REALTIME_URL,
  type NftUpdatedEvent,
  type OrderUpdatedEvent,
} from '@/contracts/realtime'
import { getToken } from '@/features/auth/token-store'
import { useSession } from '@/features/auth/use-session'
import { cartQueries } from '@/features/cart/queries'
import { checkoutQueries } from '@/features/checkout/queries'
import { nftQueries } from '@/features/nft-detail/queries'
import { mocksReady } from '@/lib/mocks-ready'

// Ponte entre o Socket.IO e o cache do React Query. Não desenha nada: fica na
// raiz do app e mantém UM socket por sessão.
//
// Regras do README, uma por trecho:
//   - duplicata (eventId já visto)            → ignora
//   - evento antigo (versão <= a conhecida)   → ignora (o estado nunca regride)
//   - reconexão                               → reconcilia com a REST
//   - troca de usuário/logout                 → fecha o socket antigo e solta os listeners
export function RealtimeBridge() {
  const { user, isPending } = useSession()
  const queryClient = useQueryClient()
  const userId = user?.id ?? null

  useEffect(() => {
    if (isPending) return
    let socket: Socket | null = null
    let cancelled = false

    // import() dinâmico, e não import no topo do arquivo: o engine.io-client
    // guarda uma referência ao WebSocket QUANDO O MÓDULO CARREGA. Carregado
    // junto com o app, ele pegaria o WebSocket nativo antes de o MSW trocá-lo
    // pelo interceptado, e as conexões iriam para a rede de verdade.
    // (De quebra, o socket.io-client sai do bundle principal.)
    // Por isso o import também espera o mock ficar pronto (mocks-ready.ts).
    void mocksReady.then(() => import('socket.io-client')).then(({ io }) => {
      if (cancelled) return
      socket = connect(io)
    })

    const connect = (io: typeof import('socket.io-client').io) => {
      // O token vai na URL (o mock lê de lá). Sem token: só eventos públicos.
      const token = userId ? getToken() : null
      const socket = io(REALTIME_URL, {
        // O mock só fala WebSocket (o binding do MSW não simula long-polling).
        transports: ['websocket'],
        query: token ? { token } : {},
        reconnectionDelay: 500,
        reconnectionDelayMax: 3_000,
      })
      const seen = new Set<string>() // eventIds já aplicados NESTA sessão

      const firstTime = (eventId: string) => {
        if (seen.has(eventId)) return false
        seen.add(eventId)
        if (seen.size > 500) seen.delete(seen.values().next().value!) // não cresce para sempre
        return true
      }

      socket.on('nft.updated', (raw: unknown) => {
        const parsed = nftUpdatedEventSchema.safeParse(raw)
        if (parsed.success && firstTime(parsed.data.eventId)) applyNftUpdated(queryClient, userId, parsed.data)
      })
      socket.on('order.updated', (raw: unknown) => {
        const parsed = orderUpdatedEventSchema.safeParse(raw)
        // userId do fechamento: um evento que chegasse atrasado de outra sessão
        // nunca escreve no cache de outro usuário.
        if (parsed.success && userId && firstTime(parsed.data.eventId)) applyOrderUpdated(queryClient, userId, parsed.data)
      })

      // Depois de cair e voltar, pode ter perdido eventos: busca de novo o que
      // está em uso (catálogo, detalhe, carrinho, cotação, pedidos).
      socket.io.on('reconnect', () => {
        void queryClient.invalidateQueries({ queryKey: ['nfts'] })
        if (userId) void queryClient.invalidateQueries({ queryKey: ['me', userId] })
        else void queryClient.invalidateQueries({ queryKey: ['cart'] })
      })

      return socket
    }

    // Limpeza: fim da sessão (logout, troca de usuário) ou desmontagem.
    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.io.removeAllListeners()
      socket?.disconnect()
    }
  }, [isPending, userId, queryClient])

  return null
}

// Maior versão já conhecida de cada NFT (pelo cache do detalhe e pelos eventos).
const knownNftVersion = new Map<string, number>()

function applyNftUpdated(queryClient: QueryClient, userId: string | null, event: NftUpdatedEvent) {
  const detailKey = nftQueries.detail(event.resourceId).queryKey
  const cached = queryClient.getQueryData<Nft>(detailKey)
  const known = Math.max(knownNftVersion.get(event.resourceId) ?? 0, cached?.version ?? 0)
  if (event.version <= known) return // atrasado ou repetido: não regride
  knownNftVersion.set(event.resourceId, event.version)

  // Detalhe aberto: atualiza NA HORA, direto no cache (preço, estoque, versão).
  if (cached) {
    queryClient.setQueryData<Nft>(detailKey, {
      ...cached,
      version: event.version,
      price: event.data.price,
      editions: cached.editions.map((edition) => {
        const next = event.data.editions.find((item) => item.id === edition.id)
        return next ? { ...edition, price: next.price, available: next.available } : edition
      }),
    })
  }
  // Listas (catálogo, destaque, relacionados): busca de novo pela REST.
  void queryClient.invalidateQueries({
    queryKey: ['nfts'],
    predicate: (query) => query.queryKey[1] !== 'detail' || query.queryKey.length > 3,
  })

  // Está no carrinho? A API recalcula avisos e totais; o checkout recebe a
  // cotação nova (e trava o "pagar" até nova confirmação).
  const cartKey = cartQueries.cart(userId).queryKey
  const cart = queryClient.getQueryData<Cart>(cartKey)
  const inCart = cart?.items.find((item) => item.nftId === event.resourceId)
  if (inCart) {
    void queryClient.invalidateQueries({ queryKey: cartKey })
    if (userId)
      void queryClient.invalidateQueries({
        queryKey: checkoutQueries.quote(userId).queryKey,
      })
    // Toast = aviso acessível (aria-live) de mudança em tempo real.
    toast.info(`${inCart.name} mudou de preço ou disponibilidade. O resumo foi atualizado.`, { id: `nft-${event.resourceId}` })
  }
}

function applyOrderUpdated(queryClient: QueryClient, userId: string, event: OrderUpdatedEvent) {
  const key = checkoutQueries.order(userId, event.resourceId).queryKey
  const current = queryClient.getQueryData<OrderUpdatedEvent['data']>(key)
  if (current && current.version >= event.version) return // não regride (ex.: "pendente" atrasado depois de "confirmado")
  queryClient.setQueryData(key, event.data)
}
