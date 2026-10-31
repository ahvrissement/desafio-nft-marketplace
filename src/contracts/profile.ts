import { z } from 'zod'

import { passwordSchema } from './auth'
import { walletAddressSchema, walletProviderSchema } from './checkout'
import { networkSchema } from './nft'

// GET/PATCH /api/me/profile ("Perfil do colecionador" do Figma)
export const profileSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(), // sem o ".eth" (o Figma mostra ".eth" num seletor ao lado)
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
})
export type Profile = z.infer<typeof profileSchema>

export const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(3, 'Use pelo menos 3 caracteres.').max(30, 'Use no máximo 30 caracteres.'),
  username: z.string().trim().regex(/^[a-z0-9_.]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou _.'),
  email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.')),
  ensName: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,30}$/, 'Use de 3 a 30 letras minúsculas, números ou hífen.'),
  walletNickname: z.string().trim().min(2, 'Informe um apelido.').max(30, 'Use no máximo 30 caracteres.'),
})
export type UpdateProfileInput = z.input<typeof updateProfileInputSchema>

// PUT /api/me/avatar: imagem pequena em data URL (o front reduz para 128px antes)
export const AVATAR_MAX_BYTES = 200_000
export const updateAvatarInputSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Use uma imagem PNG, JPG ou WEBP.')
    .max(Math.ceil((AVATAR_MAX_BYTES * 4) / 3) + 40, 'A imagem é grande demais.'),
})

// POST /api/me/password
export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: passwordSchema,
})
export type ChangePasswordInput = z.input<typeof changePasswordInputSchema>

// POST /api/me/wallets e PATCH /api/me/wallets/:id (principal e secundária)
export const walletInputSchema = z.object({
  kind: z.enum(['primary', 'secondary']),
  label: z.string().trim().min(2, 'Informe o apelido da carteira.').max(30),
  provider: walletProviderSchema,
  network: networkSchema,
  address: walletAddressSchema,
  ens: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^$|^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/, 'Use um nome ENS terminado em .eth.')
    .optional(),
})
export type WalletInput = z.input<typeof walletInputSchema>
