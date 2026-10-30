import { delay, http } from 'msw'

import { newsletterSignupResponseSchema, newsletterSignupSchema } from '@/contracts/newsletter'

import { readDb, writeDb } from '../db'
import { API, apiError, json, validationError } from '../utils'

export const newsletterHandlers = [
  http.post(`${API}/newsletter`, async ({ request }) => {
    await delay()

    // request.json() lança erro se o corpo não for JSON; tratamos como dado inválido.
    const body: unknown = await request.json().catch(() => null)
    const parsed = newsletterSignupSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const email = parsed.data.email.toLowerCase()
    if (readDb().newsletter.includes(email)) {
      return apiError(409, 'CONFLICT', 'Este e-mail já está inscrito.', {
        email: ['Este e-mail já está inscrito.'],
      })
    }

    writeDb((db) => {
      db.newsletter.push(email)
    })
    return json(newsletterSignupResponseSchema, { email }, { status: 201 })
  }),
]
