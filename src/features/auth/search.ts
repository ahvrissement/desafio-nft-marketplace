import { z } from 'zod'

export const AUTH_MODES = ['entrar', 'cadastro'] as const
export type AuthMode = (typeof AUTH_MODES)[number]

export const authSearchSchema = z.object({
  auth: z.enum(AUTH_MODES).optional().catch(undefined),
  // Para onde ir depois de entrar (ex.: uma rota privada que pediu login).
  // Só caminhos internos ("/..."): um "https://site-malicioso" seria um
  // "open redirect", golpe clássico de phishing.
  redirect: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional()
    .catch(undefined),
})
