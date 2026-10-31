import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { authResponseSchema, favoritesResponseSchema } from '@/contracts/auth'

import { readDb, resetDb, writeDb } from '../db'
import { authHandlers } from './auth'
import { favoritesHandlers } from './favorites'

const server = setupServer(...authHandlers, ...favoritesHandlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => resetDb())

async function call(method: string, path: string, { body, token }: { body?: unknown; token?: string } = {}) {
  const response = await fetch(`http://localhost/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: response.status === 204 ? null : await response.json() }
}

async function login(email: string, password = 'Kurio@123') {
  const { status, body } = await call('POST', '/auth/login', { body: { email, password } })
  expect(status).toBe(200)
  return authResponseSchema.parse(body)
}

describe('login e sessão', () => {
  it('entra com os usuários do seed (e-mail sem diferenciar maiúsculas)', async () => {
    const { user, token } = await login('ANA@kurio.dev')
    expect(user).toEqual({ id: 'user-ana', name: 'Ana Colecionadora', email: 'ana@kurio.dev', avatarUrl: null })
    const session = await call('GET', '/auth/session', { token })
    expect(session.status).toBe(200)
    expect(session.body.user.id).toBe('user-ana')
  })

  it('usa a mesma mensagem para e-mail inexistente e senha errada', async () => {
    const wrongPassword = await call('POST', '/auth/login', { body: { email: 'ana@kurio.dev', password: 'errada123' } })
    const unknownEmail = await call('POST', '/auth/login', { body: { email: 'ninguem@kurio.dev', password: 'Kurio@123' } })
    expect(wrongPassword.status).toBe(401)
    expect(wrongPassword.body).toEqual(unknownEmail.body)
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('não guarda senha em texto puro', () => {
    expect(JSON.stringify(readDb().users)).not.toContain('Kurio@123')
  })

  it('logout encerra o token no servidor', async () => {
    const { token } = await login('ana@kurio.dev')
    expect((await call('POST', '/auth/logout', { token })).status).toBe(204)
    const after = await call('GET', '/auth/session', { token })
    expect(after.status).toBe(401)
    expect(after.body.error.code).toBe('SESSION_EXPIRED')
  })

  it('sessão vencida responde SESSION_EXPIRED; sem token, UNAUTHENTICATED', async () => {
    const { token } = await login('ana@kurio.dev')
    writeDb((db) => {
      db.sessions[0].expiresAt = new Date(Date.now() - 1000).toISOString()
    })
    expect((await call('GET', '/auth/session', { token })).body.error.code).toBe('SESSION_EXPIRED')
    expect((await call('GET', '/auth/session')).body.error.code).toBe('UNAUTHENTICATED')
  })
})

describe('cadastro', () => {
  it('cria a conta, já entra e guarda só o hash', async () => {
    const { status, body } = await call('POST', '/auth/signup', { body: { name: 'Carla', email: 'carla@kurio.dev', password: 'segredo123' } })
    expect(status).toBe(201)
    expect(authResponseSchema.parse(body).user.email).toBe('carla@kurio.dev')
    expect(JSON.stringify(readDb().users)).not.toContain('segredo123')
  })

  it('e-mail repetido → 409 com erro no campo', async () => {
    const { status, body } = await call('POST', '/auth/signup', { body: { name: 'Outra Ana', email: 'ana@kurio.dev', password: 'segredo123' } })
    expect(status).toBe(409)
    expect(body.error.fieldErrors.email).toHaveLength(1)
  })

  it('senha fraca → 400 com o campo exato', async () => {
    const { status, body } = await call('POST', '/auth/signup', { body: { name: 'Carla', email: 'carla@kurio.dev', password: 'curta' } })
    expect(status).toBe(400)
    expect(Object.keys(body.error.fieldErrors)).toEqual(['password'])
  })
})

describe('favoritos', () => {
  it('cada usuário só vê os próprios favoritos', async () => {
    const ana = await login('ana@kurio.dev')
    const bruno = await login('bruno@kurio.dev')
    await call('PUT', '/me/favorites/emerald-ape-042', { token: bruno.token })

    const anaFavorites = favoritesResponseSchema.parse((await call('GET', '/me/favorites', { token: ana.token })).body)
    const brunoFavorites = favoritesResponseSchema.parse((await call('GET', '/me/favorites', { token: bruno.token })).body)
    expect(anaFavorites.nftIds).toEqual(['sage-nomad-009', 'golden-beat-207'])
    expect(brunoFavorites.nftIds).toEqual(['emerald-ape-042'])
  })

  it('PUT e DELETE são idempotentes', async () => {
    const { token } = await login('bruno@kurio.dev')
    await call('PUT', '/me/favorites/emerald-ape-042', { token })
    const twice = await call('PUT', '/me/favorites/emerald-ape-042', { token })
    expect(twice.body.nftIds).toEqual(['emerald-ape-042'])
    await call('DELETE', '/me/favorites/emerald-ape-042', { token })
    expect((await call('DELETE', '/me/favorites/emerald-ape-042', { token })).body.nftIds).toEqual([])
  })

  it('sem sessão → 401', async () => {
    expect((await call('GET', '/me/favorites')).status).toBe(401)
  })
})
