import { buy, expect, isMobile, login, open, test } from './support'

// Fluxo 5: carrinho, quantidades, remoção, cupom e persistência após refresh/login.

const summary = (page: import('@playwright/test').Page) => page.locator('section[aria-labelledby="resumo-titulo"]')

test.describe('carrinho', () => {
  test('quantidades (inclusive cliques rápidos), cupom inválido/vencido/válido e remoção', async ({ page }) => {
    await buy(page, 'emerald-ape-042')
    const table = page.locator('table')
    const plus = table.getByRole('button', { name: 'Aumentar quantidade' })
    await plus.click()
    await plus.click() // dois cliques seguidos: deve dar 3, não 2
    await expect(table.locator('output')).toHaveText('3')
    await expect(summary(page).getByText('3.586 ETH')).toBeVisible() // 3 × 1.19 + 0.016

    const coupon = summary(page).getByLabel('Código promocional')
    await coupon.fill('NAOEXISTE')
    await summary(page).getByRole('button', { name: 'Aplicar' }).click()
    await expect(summary(page).getByRole('alert')).toHaveText('Cupom inválido. Confira o código.')
    await expect(coupon).toHaveAttribute('aria-invalid', 'true')
    await coupon.fill('BOASVINDAS')
    await summary(page).getByRole('button', { name: 'Aplicar' }).click()
    await expect(summary(page).getByRole('alert')).toContainText('expirou')
    await coupon.fill('kurio10')
    await summary(page).getByRole('button', { name: 'Aplicar' }).click()
    await expect(summary(page).getByText('(-) 0.357 ETH')).toBeVisible()
    await summary(page).getByRole('button', { name: 'Remover' }).click()
    await expect(summary(page).getByText('(-) 0.00 ETH')).toBeVisible()

    await table.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
    await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
  })

  test('visitante: carrinho sobrevive ao F5 e vai para a conta no login @mobile', async ({ page }) => {
    await buy(page, 'emerald-ape-042', { quantity: 2 })
    await page.reload()
    await expect(page.getByRole('link', { name: 'Emerald Ape #042' }).filter({ visible: true })).toBeVisible()

    await login(page, 'ana', '/cart')
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'foram para o carrinho da sua conta' })).toBeVisible()
    if (!isMobile(page)) await expect(page.locator('header').getByRole('link', { name: 'Carrinho, 2 itens' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('kurio:guest-cart'))).toBeNull()
  })

  test('estoque é conferido pela API (409 vira aviso)', async ({ page }) => {
    await buy(page, 'emerald-ape-042', { quantity: 4, edition: '1-10' })
    await open(page, '/nft/emerald-ape-042?edition=1-10')
    await page.locator('section[aria-labelledby="nft-titulo"]').getByRole('button', { name: 'Comprar', exact: true }).click()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Só é possível ter 4 unidades' })).toBeVisible()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
  })
})
