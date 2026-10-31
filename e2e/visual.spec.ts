import type { Page } from '@playwright/test'

import { buy, expect, login, test } from './support'

// Regressão visual (README): início, detalhe, carrinho e pagamento, desktop e
// mobile, com baselines versionadas (e2e/visual.spec.ts-snapshots/).
// Dados estáveis: seed fixo do mock, relógio congelado e imagens carregadas.

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => [...document.images].filter((image) => image.loading !== 'lazy').every((image) => image.complete))
  await page.evaluate(() => document.fonts.ready)
}

const snapshot = (page: Page, name: string) =>
  expect(page).toHaveScreenshot(`${name}.png`, {
    // O botão "Cenários" (só do mock) e os toasts não fazem parte do layout.
    mask: [page.getByRole('button', { name: /Cenários/ }), page.locator('[data-sonner-toaster]')],
  })

test.describe('regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-30T12:00:00-03:00'))
  })

  test('início @mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#mercado article')).toHaveCount(9)
    await settle(page)
    await snapshot(page, 'inicio')
  })

  test('detalhe @mobile', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await settle(page)
    await snapshot(page, 'detalhe')
  })

  test('carrinho @mobile', async ({ page }) => {
    await buy(page, 'emerald-ape-042', { quantity: 2 })
    await expect(page.getByText('2.396 ETH').first()).toBeVisible()
    await settle(page)
    await snapshot(page, 'carrinho')
  })

  test('pagamento @mobile', async ({ page }) => {
    await login(page, 'ana')
    await buy(page, 'emerald-ape-042', { quantity: 2 })
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Seus NFTs' })).toBeVisible()
    await settle(page)
    await snapshot(page, 'pagamento')
  })
})
