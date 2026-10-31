import { expect, test as base, type Page } from '@playwright/test'

// Utilitários dos testes E2E.
//
// Os testes controlam o backend falso pelas rotas /api/__dev do MSW (as
// mesmas do painel de cenários): o fetch sai DA PÁGINA, então passa pelo
// mesmo service worker que o app usa. Nada de atalho direto no cache.

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@123', name: 'Ana Colecionadora' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@123', name: 'Bruno Criador' },
} as const

// O app desenha a tela antes de o MSW ficar pronto (src/lib/mocks-ready.ts) e
// marca <html data-mocks="ready"> quando ele começa a atender.
export const waitForMocks = (page: Page) => expect(page.locator('html[data-mocks="ready"]')).toBeAttached()

export async function devApi(page: Page, method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown) {
  await waitForMocks(page)
  return page.evaluate(
    async ([m, p, b]) => {
      const response = await fetch(`/api${p}`, {
        method: m,
        headers: { 'Content-Type': 'application/json' },
        body: b === undefined ? undefined : JSON.stringify(b),
      })
      return response.status === 204 ? null : response.json()
    },
    [method, path, body] as const,
  )
}

export type Scenarios = Partial<{
  latency: 'normal' | 'slow' | 'variable'
  failure: 'none' | 'offline' | 'server-error' | 'unavailable' | 'timeout'
  walletConnect: 'approve' | 'decline'
  payment: 'confirm' | 'decline'
  orderTimeout: boolean
}>

export const setScenarios = (page: Page, scenarios: Scenarios) => devApi(page, 'PUT', '/__dev/scenarios', scenarios)

export const updateNft = (page: Page, update: { nftId: string; editionId: string; price?: string; available?: number | null }) =>
  devApi(page, 'POST', '/__dev/nft-update', update)

// Abre a página e espera o app montar e o mock ficar pronto.
export async function open(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('main#conteudo')).toBeVisible()
  await waitForMocks(page)
}

// Login pelo modal (?auth=entrar), na página indicada.
export async function login(page: Page, user: keyof typeof USERS = 'ana', path = '/') {
  const separator = path.includes('?') ? '&' : '?'
  await open(page, `${path}${separator}auth=entrar`)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS[user].email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS[user].password)
  await dialog.locator('button[type=submit]').click()
  await expect(dialog).toBeHidden()
}

// Adiciona pelo botão "Comprar" do detalhe (vai para o carrinho).
export async function buy(page: Page, nftId: string, { quantity = 1, edition }: { quantity?: number; edition?: string } = {}) {
  await open(page, `/nft/${nftId}${edition ? `?edition=${edition}` : ''}`)
  const sheet = page.locator('section[aria-labelledby="nft-titulo"]')
  await expect(sheet.getByRole('heading', { level: 1 })).toBeVisible()
  const isMobile = (page.viewportSize()?.width ?? 1440) < 1024
  const stepper = isMobile ? page.getByRole('group', { name: 'Qtd' }) : sheet.getByRole('group', { name: 'Quantidade' })
  for (let i = 1; i < quantity; i++) await stepper.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: isMobile ? 'Comprar NFT' : 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024

export const test = base
export { expect }
