import { z } from 'zod'

import { orderSchema } from './checkout'
import { ethAmountSchema } from './common'

// Endereço do "servidor" Socket.IO. É um domínio que não existe de propósito:
// quem responde é o MSW (mocks/realtime.ts), nunca a rede.
export const REALTIME_URL = 'wss://realtime.kurio.test'

// Todo evento carrega (README): identidade estável (eventId), recurso afetado
// (resourceId) e versão. Com isso o cliente descarta duplicatas (eventId já
// visto) e eventos antigos (versão <= a que ele já tem).
const envelope = <T extends string, D extends z.ZodType>(type: T, data: D) =>
  z.object({
    eventId: z.string(),
    type: z.literal(type),
    resourceId: z.string(),
    version: z.number().int().positive(),
    occurredAt: z.iso.datetime(),
    data,
  })

export const nftUpdatedEventSchema = envelope(
  'nft.updated',
  z.object({
    price: ethAmountSchema,
    editions: z.array(z.object({ id: z.string(), price: ethAmountSchema, available: z.number().int().nonnegative().nullable() })),
  }),
)
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = envelope('order.updated', orderSchema)
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export type RealtimeEvent = NftUpdatedEvent | OrderUpdatedEvent
