import axios, { type AxiosRequestConfig } from 'axios'
import type { z } from 'zod'

import { apiErrorBodySchema } from '@/contracts/common'
import { getToken } from '@/features/auth/token-store'

import { mocksReady } from './mocks-ready'

// Códigos que não vêm da API, mas do próprio cliente:
//   NETWORK_ERROR    a requisição nem chegou (offline, DNS, CORS)
//   TIMEOUT          passou do tempo limite sem resposta
//   INVALID_RESPONSE chegou resposta, mas fora do contrato (o zod reprovou)
export type ClientErrorCode = 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE'

// Todo erro que sai daqui é um ApiError, então componentes e o React Query
// lidam com UM formato só, venha o erro do servidor, da rede ou do zod.
export class ApiError extends Error {
  readonly status: number | null
  readonly code: string
  readonly fieldErrors: Record<string, string[]>

  constructor(options: {
    status: number | null
    code: string
    message: string
    fieldErrors?: Record<string, string[]>
  }) {
    super(options.message)
    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code
    this.fieldErrors = options.fieldErrors ?? {}
  }

  // Vale a pena tentar de novo? Só para falhas transitórias:
  // rede/timeout, 5xx, 408 (Request Timeout) e 429 (Too Many Requests).
  // Os outros 4xx são definitivos: repetir dá o mesmo resultado.
  get isRetryable(): boolean {
    if (this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT') return true
    if (this.status === null) return false
    return this.status >= 500 || this.status === 408 || this.status === 429
  }
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { Accept: 'application/json' },
  // Arrays viram parâmetros repetidos: { network: ['a', 'b'] } → ?network=a&network=b.
  // O padrão do Axios seria ?network[]=a&network[]=b, que o nosso mock não espera.
  paramsSerializer: { indexes: null },
})

// Interceptor de REQUISIÇÃO: anexa o token da sessão em toda chamada.
// Os componentes nunca lidam com o header; quem decide é este ponto único.
// Antes, espera o mock ficar pronto (mocks-ready.ts). Depois disso, a Promise
// já resolvida não atrasa nada.
http.interceptors.request.use(async (config) => {
  await mocksReady
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// Quem avisa a interface quando a sessão expira. O http.ts não conhece React,
// router nem cache: o main.tsx registra a função (inversão de dependência).
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler
}

// Interceptor de RESPOSTA: roda em toda resposta com erro, antes de chegar em quem chamou.
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)
    // Mandamos um token e a API disse que ele não vale mais: a sessão acabou,
    // não importa qual tela fez a chamada. Um lugar só trata isso.
    const sentToken = axios.isAxiosError(error) && error.config?.headers?.has('Authorization')
    if (apiError.code === 'SESSION_EXPIRED' && sentToken) onSessionExpired?.()
    return Promise.reject(apiError)
  },
)

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError({ status: null, code: 'TIMEOUT', message: 'O servidor demorou para responder.' })
    }
    if (!error.response) {
      return new ApiError({ status: null, code: 'NETWORK_ERROR', message: 'Sem conexão com o servidor.' })
    }
    // Chegou resposta com status de erro: tenta ler no formato do nosso contrato.
    const parsed = apiErrorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      return new ApiError({ status: error.response.status, ...parsed.data.error })
    }
    return new ApiError({
      status: error.response.status,
      code: 'INTERNAL_ERROR',
      message: 'Erro inesperado no servidor.',
    })
  }

  return new ApiError({
    status: null,
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Erro desconhecido.',
  })
}

// Faz a requisição E valida a resposta contra o contrato.
// Uso: request(nftSchema, { url: '/nfts/42' })  →  Promise<Nft>
// Se o servidor mandar algo fora do formato, o erro aparece aqui, com o campo
// exato, em vez de virar um "undefined" misterioso dentro de um componente.
export async function request<T extends z.ZodType>(
  schema: T,
  config: AxiosRequestConfig,
): Promise<z.infer<T>> {
  const response = await http.request(config)
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    if (import.meta.env.DEV) console.error('Resposta fora do contrato', config.url, parsed.error.issues)
    throw new ApiError({
      status: response.status,
      code: 'INVALID_RESPONSE',
      message: 'O servidor respondeu em um formato inesperado.',
    })
  }
  return parsed.data
}
