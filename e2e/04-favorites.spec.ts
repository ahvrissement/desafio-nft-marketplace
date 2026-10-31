import { expect, login, open, setScenarios, test } from './support'

// Fluxo 4: favoritos, incluindo falha de mutation e recuperação do estado.

test.describe('favoritos', () => {
  test('favoritar é otimista e persiste após F5', async ({ page }) => {
    await login(page, 'bruno', '/nft/emerald-ape-042')
    const button = page.locator('section[aria-labelledby="nft-titulo"]').getByRole('button', { name: /Favorit/ })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toHaveText('Favoritado')
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'foi para os seus favoritos' })).toBeVisible()
    await page.reload()
    await expect(button).toHaveText('Favoritado')
  })

  test('falha da API desfaz a mudança (rollback) e avisa; depois recupera', async ({ page }) => {
    await login(page, 'bruno', '/nft/emerald-ape-042')
    const button = page.locator('section[aria-labelledby="nft-titulo"]').getByRole('button', { name: /Favorit/ })
    await expect(button).toHaveText('Favoritar')

    await setScenarios(page, { failure: 'server-error' })
    await button.click()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Não foi possível atualizar seus favoritos' })).toBeVisible()
    await expect(button).toHaveText('Favoritar') // rollback

    await setScenarios(page, { failure: 'none' })
    await button.click()
    await expect(button).toHaveText('Favoritado')
  })

  test('visitante que tenta favoritar vê o login @mobile', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await page.getByRole('button', { name: /^Favoritar/ }).first().click()
    await expect(page).toHaveURL(/auth=entrar/)
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
