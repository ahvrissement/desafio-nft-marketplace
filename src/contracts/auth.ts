import { z } from 'zod'

import { nftSummarySchema } from './nft'

// ---------------------------------------------------------------------------
// Conta e sessão
// ---------------------------------------------------------------------------

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

// Regras de senha, iguais no front (mensagem na hora) e no mock (a palavra final).
export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'A senha precisa ter pelo menos uma letra.')
  .regex(/\d/, 'A senha precisa ter pelo menos um número.')

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.'))

// POST /api/auth/login
export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe a senha.'),
})
export type LoginInput = z.input<typeof loginInputSchema>

// POST /api/auth/signup. O "confirmar senha" é só do formulário: não vai para a API.
export const signupInputSchema = z.object({
  name: z.string().trim().min(3, 'O nome precisa ter pelo menos 3 caracteres.').max(30, 'Use no máximo 30 caracteres.'),
  email: emailSchema,
  password: passwordSchema,
})
export type SignupInput = z.input<typeof signupInputSchema>

// Resposta de login e cadastro. O token vai no header Authorization das próximas chamadas.
export const authResponseSchema = z.object({
  token: z.string().min(20),
  expiresAt: z.iso.datetime(),
  user: userSchema,
})
export type AuthResponse = z.infer<typeof authResponseSchema>

// GET /api/auth/session
export const sessionResponseSchema = z.object({
  expiresAt: z.iso.datetime(),
  user: userSchema,
})

// ---------------------------------------------------------------------------
// Favoritos (GET /api/me/favorites, PUT e DELETE /api/me/favorites/:nftId)
// ---------------------------------------------------------------------------

export const favoritesResponseSchema = z.object({ nftIds: z.array(z.string()) })
export type FavoritesResponse = z.infer<typeof favoritesResponseSchema>

// GET /api/me/favorites/nfts: os favoritos já no formato dos cards (a página
// "Meus favoritos" não precisa buscar NFT por NFT).
export const favoriteNftsResponseSchema = z.object({ items: z.array(nftSummarySchema) })
