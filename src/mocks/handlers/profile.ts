import { delay, http, HttpResponse } from 'msw'

import { walletSchema, walletsResponseSchema } from '@/contracts/checkout'
import { changePasswordInputSchema, profileSchema, updateAvatarInputSchema, updateProfileInputSchema, walletInputSchema } from '@/contracts/profile'

import { hashPassword, randomToken } from '../crypto'
import { readDb, writeDb, type DbUser } from '../db'
import { requireSession } from '../session'
import { API, apiError, json, validationError } from '../utils'

const toProfile = (user: DbUser) => ({
  displayName: user.name,
  username: user.username,
  email: user.email,
  ensName: user.ensName,
  walletNickname: user.walletNickname,
  avatarUrl: user.avatarUrl,
})

const updateUser = (userId: string, mutate: (user: DbUser) => void) => {
  writeDb((db) => mutate(db.users.find((item) => item.id === userId)!))
  return readDb().users.find((item) => item.id === userId)!
}

export const profileHandlers = [
  http.get(`${API}/me/profile`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    return json(profileSchema, toProfile(session.user))
  }),

  http.patch(`${API}/me/profile`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = updateProfileInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const { displayName, username, email, ensName, walletNickname } = parsed.data
    const others = readDb().users.filter((item) => item.id !== session.user.id)
    // Conflitos com OUTRAS contas: e-mail e nome de usuário são únicos.
    const fieldErrors: Record<string, string[]> = {}
    if (others.some((item) => item.email === email)) fieldErrors.email = ['Este e-mail já é usado por outra conta.']
    if (others.some((item) => item.username.toLowerCase() === username.toLowerCase())) fieldErrors.username = ['Este nome de usuário já existe.']
    if (Object.keys(fieldErrors).length > 0) return apiError(409, 'CONFLICT', 'Alguns dados já estão em uso.', fieldErrors)

    const user = updateUser(session.user.id, (target) => {
      Object.assign(target, { name: displayName, username, email, ensName, walletNickname })
    })
    return json(profileSchema, toProfile(user))
  }),

  http.put(`${API}/me/avatar`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = updateAvatarInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const user = updateUser(session.user.id, (target) => {
      target.avatarUrl = parsed.data.dataUrl
    })
    return json(profileSchema, toProfile(user))
  }),

  http.delete(`${API}/me/avatar`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const user = updateUser(session.user.id, (target) => {
      target.avatarUrl = null
    })
    return json(profileSchema, toProfile(user))
  }),

  // Troca de senha: confere a ATUAL (hash) e grava o hash da nova, com salt novo.
  http.post(`${API}/me/password`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = changePasswordInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const { currentPassword, newPassword } = parsed.data
    if ((await hashPassword(currentPassword, session.user.passwordSalt)) !== session.user.passwordHash) {
      return apiError(400, 'VALIDATION_ERROR', 'Senha atual incorreta.', { currentPassword: ['Senha atual incorreta.'] })
    }
    if (currentPassword === newPassword) {
      return apiError(400, 'VALIDATION_ERROR', 'Use uma senha diferente da atual.', { newPassword: ['Use uma senha diferente da atual.'] })
    }
    const salt = randomToken(8)
    const passwordHash = await hashPassword(newPassword, salt)
    updateUser(session.user.id, (target) => {
      target.passwordSalt = salt
      target.passwordHash = passwordHash
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // Carteiras: no máximo UMA principal e UMA secundária (como no Figma).
  http.post(`${API}/me/wallets`, async ({ request }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = walletInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const userId = session.user.id
    const wallets = readDb().wallets[userId] ?? []
    if (wallets.some((wallet) => wallet.kind === parsed.data.kind)) {
      return apiError(409, 'CONFLICT', 'Você já tem uma carteira deste tipo. Edite a existente.')
    }
    if (wallets.some((wallet) => wallet.address.toLowerCase() === parsed.data.address.toLowerCase())) {
      return apiError(409, 'CONFLICT', 'Este endereço já está cadastrado.', { address: ['Este endereço já está cadastrado.'] })
    }
    const wallet = walletSchema.parse({ id: `wallet-${randomToken(6)}`, ...parsed.data, ens: parsed.data.ens || null })
    writeDb((db) => {
      db.wallets[userId] = [...(db.wallets[userId] ?? []), wallet]
    })
    return json(walletsResponseSchema, { items: readDb().wallets[userId] }, { status: 201 })
  }),

  http.patch(`${API}/me/wallets/:walletId`, async ({ request, params }) => {
    await delay()
    const session = requireSession(request)
    if ('error' in session) return session.error
    const parsed = walletInputSchema.safeParse(await request.json())
    if (!parsed.success) return validationError(parsed.error)
    const userId = session.user.id
    const wallets = readDb().wallets[userId] ?? []
    if (!wallets.some((wallet) => wallet.id === params.walletId)) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
    if (wallets.some((wallet) => wallet.id !== params.walletId && wallet.address.toLowerCase() === parsed.data.address.toLowerCase())) {
      return apiError(409, 'CONFLICT', 'Este endereço já está cadastrado.', { address: ['Este endereço já está em outra carteira.'] })
    }
    writeDb((db) => {
      db.wallets[userId] = db.wallets[userId].map((wallet) =>
        wallet.id === params.walletId ? { ...wallet, ...parsed.data, ens: parsed.data.ens || null } : wallet,
      )
    })
    return json(walletsResponseSchema, { items: readDb().wallets[userId] })
  }),
]
