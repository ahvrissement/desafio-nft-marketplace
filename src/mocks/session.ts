import type { User } from '@/contracts/auth'

import { readDb, writeDb, type DbUser } from './db'
import { randomToken } from './crypto'
import { apiError } from './utils'

// Sessão "deslizante": cada requisição autenticada empurra o vencimento para
// daqui a 30 minutos. Quem fica parado mais que isso perde a sessão.
export const SESSION_TTL_MS = 30 * 60_000

export function toPublicUser(user: DbUser): User {
  // Nunca devolve salt e hash: o front não tem por que conhecê-los.
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl }
}

export function createSession(userId: string) {
  const session = { token: randomToken(), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() }
  writeDb((db) => {
    // Aproveita para limpar sessões vencidas: o banco não cresce para sempre.
    db.sessions = db.sessions.filter((item) => Date.parse(item.expiresAt) > Date.now())
    db.sessions.push(session)
  })
  return session
}

export function readToken(request: Request): string | null {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

// A "catraca" das rotas privadas. Devolve o usuário, ou a resposta de erro
// pronta para o handler retornar:
//   sem token          → 401 UNAUTHENTICATED
//   token desconhecido → 401 SESSION_EXPIRED (logout em outra aba, banco resetado)
//   token vencido      → 401 SESSION_EXPIRED
export function requireSession(request: Request): { user: DbUser; expiresAt: string } | { error: Response } {
  const token = readToken(request)
  if (!token) return { error: apiError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.') }

  const db = readDb()
  const session = db.sessions.find((item) => item.token === token)
  const user = session && db.users.find((item) => item.id === session.userId)
  if (!session || !user || Date.parse(session.expiresAt) <= Date.now()) {
    return { error: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') }
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  writeDb((draft) => {
    const stored = draft.sessions.find((item) => item.token === token)
    if (stored) stored.expiresAt = expiresAt
  })
  return { user, expiresAt }
}
