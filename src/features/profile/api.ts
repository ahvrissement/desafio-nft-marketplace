import { walletsResponseSchema } from '@/contracts/checkout'
import {
  profileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
  type WalletInput,
} from '@/contracts/profile'
import { http, request } from '@/lib/http'

export const fetchProfile = (signal?: AbortSignal) => request(profileSchema, { url: '/me/profile', signal })
export const updateProfile = (input: UpdateProfileInput) => request(profileSchema, { method: 'PATCH', url: '/me/profile', data: input })
export const updateAvatar = (dataUrl: string) => request(profileSchema, { method: 'PUT', url: '/me/avatar', data: { dataUrl } })
export const removeAvatar = () => request(profileSchema, { method: 'DELETE', url: '/me/avatar' })
export const changePassword = async (input: ChangePasswordInput) => {
  await http.post('/me/password', input)
}

export async function saveWallet(input: WalletInput, walletId?: string) {
  const { items } = await request(walletsResponseSchema, {
    method: walletId ? 'PATCH' : 'POST',
    url: walletId ? `/me/wallets/${encodeURIComponent(walletId)}` : '/me/wallets',
    data: input,
  })
  return items
}

// Reduz a imagem para 128×128 (webp) antes de enviar: o avatar cabe no
// localStorage do mock e não pesa na página. Recusa o que não é imagem.
export async function imageToAvatar(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Use uma imagem PNG, JPG ou WEBP.')
  if (file.size > 5_000_000) throw new Error('A imagem precisa ter até 5 MB.')
  const bitmap = await createImageBitmap(file)
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')!
  // Recorta o centro (quadrado) e redimensiona
  const side = Math.min(bitmap.width, bitmap.height)
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  return canvas.toDataURL('image/webp', 0.85)
}
