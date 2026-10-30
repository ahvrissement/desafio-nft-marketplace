import { z } from 'zod'

// POST /api/newsletter: formulário "Antecipe-se ao próximo lançamento" do Footer.
// O mesmo schema valida o formulário (front) e o corpo da requisição (mock).
export const newsletterSignupSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
})
export type NewsletterSignup = z.infer<typeof newsletterSignupSchema>

export const newsletterSignupResponseSchema = z.object({
  email: z.email(),
})
