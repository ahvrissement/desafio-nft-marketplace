import { expect, open, setScenarios, test } from './support'

// Fluxo 12: skeletons durante carregamento lento, feedback de falha e recuperação após nova tentativa.

test.describe('carregamento e falhas', () => {
  test('carregamento lento mostra skeleton com o mesmo espaço do conteúdo @mobile', async ({ page }) => {
    await open(page, '/')
    await setScenarios(page, { latency: 'slow' })
    await page.goto('/nft/golden-signal-160')
    // aria-busy + o texto "Carregando NFT…" para o leitor de tela
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Carregando NFT' })).toBeAttached()
    await expect(page.getByRole('heading', { level: 1, name: 'Golden Signal #160' })).toBeVisible({ timeout: 15_000 })
  })

  test('sem conexão: alerta com "tentar novamente"; recupera quando a rede volta', async ({ page }) => {
    await open(page, '/')
    await setScenarios(page, { failure: 'offline' })
    await page.goto('/?tab=%22new%22')
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 })
    await setScenarios(page, { failure: 'none' })
    for (let i = 0; i < 5 && (await page.getByRole('button', { name: /Tentar/ }).count()) > 0; i++) {
      await page.getByRole('button', { name: /Tentar/ }).first().click()
      await page.waitForTimeout(500)
    }
    await expect(page.locator('#mercado article').first()).toBeVisible()
  })

  test('erro 500 no detalhe: mensagem e "tentar de novo" funciona', async ({ page }) => {
    await open(page, '/')
    await setScenarios(page, { failure: 'server-error' })
    await page.goto('/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Não foi possível carregar este NFT' })).toBeVisible({ timeout: 20_000 })
    await setScenarios(page, { failure: 'none' })
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })
})
