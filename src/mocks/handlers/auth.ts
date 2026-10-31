import { delay, http, HttpResponse } from 'msw'

import { authResponseSchema, loginInputSchema, sessionResponseSchema, signupInputSchema } from '@/contracts/auth'

import { hashPassword, randomToken } from '../crypto'
import { readDb, writeDb } from '../db'
import { createSession, readToken, requireSession, toPublicUser } from '../session'
import { API, apiError, json, validationError } from '../utils'

export const authHandlers = [
  // POST /api/auth/signup → 201 { token, expiresAt, user }
  http.post(`${API}/auth/signup`, async ({ request }) => {
    await delay()
    const parsed = signupInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const { name, email, password } = parsed.data
    if (readDb().users.some((user) => user.email === email)) {
      // 409 com o campo: o formulário mostra o erro embaixo do e-mail.
      return apiError(409, 'CONFLICT', 'Este e-mail já está cadastrado.', {
        email: ['Este e-mail já está cadastrado. Entre ou use outro e-mail.'],
      })
    }

    const salt = randomToken(8)
    const username = email.split('@')[0].replace(/[^a-z0-9_.]/g, '').slice(0, 20).padEnd(3, '0')
    const user = {
      id: `user-${randomToken(6)}`,
      name,
      email,
      passwordSalt: salt,
      passwordHash: await hashPassword(password, salt),
      avatarUrl: null,
      username,
      ensName: username.replace(/[_.]/g, '-'),
      walletNickname: 'Principal',
    }
    writeDb((db) => {
      db.users.push(user)
    })
    const session = createSession(user.id)
    return json(authResponseSchema, { token: session.token, expiresAt: session.expiresAt, user: toPublicUser(user) }, { status: 201 })
  }),

  // POST /api/auth/login → 200 { token, expiresAt, user } | 401 INVALID_CREDENTIALS
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay()
    const parsed = loginInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)

    const user = readDb().users.find((item) => item.email === parsed.data.email)
    // A MESMA mensagem para "e-mail não existe" e "senha errada": dizer qual dos
    // dois falhou ajudaria quem tenta descobrir e-mails cadastrados.
    if (!user || (await hashPassword(parsed.data.password, user.passwordSalt)) !== user.passwordHash) {
      return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    const session = createSession(user.id)
    return json(authResponseSchema, { token: session.token, expiresAt: session.expiresAt, user: toPublicUser(user) })
  }),

  // GET /api/auth/session → 200 { expiresAt, user } | 401
  http.get(`${API}/auth/session`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    return json(sessionResponseSchema, { expiresAt: session.expiresAt, user: toPublicUser(session.user) })
  }),

  // POST /api/auth/logout → 204. Encerra o token no "servidor": mesmo que alguém
  // o tenha copiado, ele para de funcionar.
  http.post(`${API}/auth/logout`, async ({ request }) => {
    await delay()
    const token = readToken(request)
    writeDb((db) => {
      db.sessions = db.sessions.filter((item) => item.token !== token)
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
