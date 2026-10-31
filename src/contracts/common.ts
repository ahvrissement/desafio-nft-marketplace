import { z } from 'zod'

import { ETH_AMOUNT_REGEX } from '@/lib/money'

// Contratos compartilhados por todos os recursos da API.
// "Contrato" = o formato exato que front e mock combinam para cada resposta.

export const ethAmountSchema = z.string().regex(ETH_AMOUNT_REGEX, 'Valor em ETH inválido')

// Todo erro da API tem este formato. Assim o front trata qualquer erro do mesmo jeito.
//   { "error": { "code": "NOT_FOUND", "message": "NFT não encontrado" } }
// fieldErrors só aparece em VALIDATION_ERROR: { "email": ["E-mail inválido"] }
export const API_ERROR_CODES = [
  'VALIDATION_ERROR', // 400/422 dados enviados inválidos
  'UNAUTHENTICATED', // 401 rota privada chamada sem sessão
  'SESSION_EXPIRED', // 401 o token enviado venceu ou foi encerrado (logout em outra aba)
  'INVALID_CREDENTIALS', // 401 e-mail ou senha incorretos no login
  'FORBIDDEN', // 403 logado, mas sem permissão para este recurso
  'NOT_FOUND', // 404
  'CONFLICT', // 409 estado mudou (estoque, preço, e-mail já cadastrado, chave idempotente reutilizada)
  'INTERNAL_ERROR', // 500
  'SERVICE_UNAVAILABLE', // 503 falha transitória
] as const

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES)
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

// Uma função que GERA um schema: paginated(nftSummarySchema) descreve
// { items: NftSummary[], page, pageSize, total, totalPages }.
export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
}
