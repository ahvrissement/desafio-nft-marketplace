import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws, type WebSocketHandlerConnection } from 'msw'

import type { Order } from '@/contracts/checkout'
import { REALTIME_URL, type NftUpdatedEvent, type OrderUpdatedEvent, type RealtimeEvent } from '@/contracts/realtime'
import type { Nft } from '@/contracts/nft'

import { randomToken } from './crypto'
import { readDb } from './db'

// "Servidor" Socket.IO do mock. O MSW intercepta o WebSocket do navegador
// (nada sai para a rede) e o @mswjs/socket.io-binding traduz o protocolo do
// Socket.IO, para o app usar o socket.io-client de verdade (README).
//
// Limitações (documentadas no ARCHITECTURE.md): só transporte WebSocket (sem
// long-polling), só o namespace "/", sem rooms. Por isso o mock guarda as
// conexões e decide a quem entregar cada evento.

interface Client {
  id: string
  userId: string | null // null = visitante (só recebe eventos públicos)
  io: ReturnType<typeof toSocketIo>
  close: () => void
}

const clients = new Map<string, Client>()
let lastEvent: { event: RealtimeEvent; userId: string | null } | null = null

// O cliente manda o token na query da URL (o binding não expõe o "auth" do
// handshake). Token inválido = conexão de visitante: nada privado chega nela.
function userIdFromUrl(url: URL): string | null {
  const token = url.searchParams.get('token')
  if (!token) return null
  const db = readDb()
  const session = db.sessions.find((item) => item.token === token && Date.parse(item.expiresAt) > Date.now())
  return session?.userId ?? null
}

// Só o domínio, sem "/socket.io/": o próprio MSW remove esse prefixo do
// caminho antes de comparar (ele conhece o Socket.IO). Com "/socket.io/*" no
// padrão, nada casava e a conexão escapava para a rede de verdade.
const realtime = ws.link(REALTIME_URL)

export const realtimeHandlers = [
  realtime.addEventListener('connection', (connection: WebSocketHandlerConnection) => {
    const id = randomToken(4)
    const io = toSocketIo(connection)
    const userId = userIdFromUrl(connection.client.url)
    clients.set(id, { id, userId, io, close: () => connection.client.close() })

    // O binding anuncia pingInterval de 25s. Sem "ping" (pacote "2") do lado
    // do servidor, o cliente acharia que caiu e reconectaria a cada ~30s.
    const heartbeat = setInterval(() => connection.client.send('2'), 20_000)
    connection.client.addEventListener('close', () => {
      clearInterval(heartbeat)
      clients.delete(id)
    })
  }),
]

function deliver(event: RealtimeEvent, userId: string | null) {
  lastEvent = { event, userId }
  for (const client of clients.values()) {
    // Evento privado (pedido) só vai para as conexões DO DONO.
    if (userId !== null && client.userId !== userId) continue
    client.io.client.emit(event.type, event)
  }
}

// nft.updated: público. Leva preço e estoque de cada edição, com a versão.
export function emitNftUpdated(nft: Nft) {
  const event: NftUpdatedEvent = {
    eventId: `evt-${randomToken(8)}`,
    type: 'nft.updated',
    resourceId: nft.id,
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: { price: nft.price, editions: nft.editions.map(({ id, price, available }) => ({ id, price, available })) },
  }
  deliver(event, null)
}

// order.updated: privado. Leva o pedido inteiro (snapshot) com a versão.
export function emitOrderUpdated(order: Order, userId: string) {
  const event: OrderUpdatedEvent = {
    eventId: `evt-${randomToken(8)}`,
    type: 'order.updated',
    resourceId: order.id,
    version: order.version,
    occurredAt: new Date().toISOString(),
    data: order,
  }
  deliver(event, userId)
}

// --- Para o painel de cenários e os testes -------------------------------

// Reenvia o último evento IGUALZINHO (mesmo eventId): o cliente deve ignorar.
export function replayLastEvent() {
  if (lastEvent) deliver(lastEvent.event, lastEvent.userId)
  return Boolean(lastEvent)
}

// Reenvia o último evento como se fosse ANTIGO (eventId novo, versão menor):
// o cliente não pode regredir um estado mais recente.
export function sendStaleLastEvent() {
  if (!lastEvent) return false
  const { event, userId } = lastEvent
  deliver({ ...event, eventId: `evt-${randomToken(8)}`, version: event.version - 1 } as RealtimeEvent, userId)
  return true
}

// Derruba todas as conexões: o socket.io-client reconecta sozinho, e o app
// reconcilia com a REST (README: "após reconexão, reconcilie").
export function dropAllConnections() {
  const count = clients.size
  for (const client of clients.values()) client.close()
  return count
}

export const connectedClients = () => clients.size
