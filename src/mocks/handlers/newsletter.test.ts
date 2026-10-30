import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { resetDb } from '../db'
import { newsletterHandlers } from './newsletter'

const server = setupServer(...newsletterHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => resetDb())

async function subscribe(body: unknown) {
  const response = await fetch('http://localhost/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

describe('POST /api/newsletter', () => {
  it('inscreve um e-mail válido', async () => {
    const { status, body } = await subscribe({ email: 'Colecionador@Kurio.com' })
    expect(status).toBe(201)
    expect(body).toEqual({ email: 'colecionador@kurio.com' }) // normalizado
  })

  it('rejeita e-mail inválido com o erro no campo', async () => {
    const { status, body } = await subscribe({ email: 'nao-e-email' })
    expect(status).toBe(400)
    expect(body.error.fieldErrors.email).toEqual(['Informe um e-mail válido.'])
  })

  it('responde 409 para e-mail já inscrito, sem diferenciar maiúsculas', async () => {
    await subscribe({ email: 'a@kurio.com' })
    const { status, body } = await subscribe({ email: 'A@KURIO.COM' })
    expect(status).toBe(409)
    expect(body.error.code).toBe('CONFLICT')
  })
})
