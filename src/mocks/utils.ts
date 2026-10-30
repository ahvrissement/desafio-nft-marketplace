import { HttpResponse, type JsonBodyType } from 'msw'
import { z } from 'zod'

import type { ApiErrorCode } from '@/contracts/common'

// "*/api" e não "/api": o * aceita qualquer origem. No navegador a URL é
// http://localhost:5173/api/..., nos testes (Node) é http://localhost/api/...
// Com o curinga, os mesmos handlers servem nos dois ambientes.
export const API = '*/api'

// Resposta de sucesso que PASSA PELO CONTRATO antes de sair.
// Se um handler montar um objeto fora do formato, o erro estoura aqui,
// no mock, em vez de enganar o front com dados que a API real nunca mandaria.
export function json<T extends z.ZodType>(schema: T, body: z.input<T>, init?: ResponseInit) {
  return HttpResponse.json(schema.parse(body) as JsonBodyType, init)
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
) {
  return HttpResponse.json({ error: { code, message, fieldErrors } }, { status })
}

// Converte o erro do zod em { campo: [mensagens] }, o formato do nosso contrato.
export function validationError(error: z.ZodError) {
  const { fieldErrors } = z.flattenError(error)
  return apiError(400, 'VALIDATION_ERROR', 'Dados inválidos.', fieldErrors as Record<string, string[]>)
}
