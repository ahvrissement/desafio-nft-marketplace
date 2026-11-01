import { expect, login, open, setScenarios, test } from './support'

// Fluxo 4: favoritos, incluindo falha de mutation e recuperação do estado.

test.describe('favoritos', () => {
  test('favoritar é otimista e persiste após F5', async ({ page }) => {
    await login(page, 'pedro', '/nft/emerald-ape-042')
    const button = page.locator('section[aria-labelledby="nft-titulo"]').getByRole('button', { name: /Favorit/ })
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button).toHaveText('Favoritado')
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'foi para os seus favoritos' })).toBeVisible()
    await page.reload()
    await expect(button).toHaveText('Favoritado')
  })

  test('falha da API desfaz a mudança (rollback) e avisa; depois recupera', async ({ page }) => {
    await login(page, 'pedro', '/nft/emerald-ape-042')
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

test.describe('página de favoritos', () => {
  test('lista, desfavoritar tira da lista e estado vazio; atalho no rodapé', async ({ page }) => {
    await login(page, 'ana')
    // Atalho do rodapé ("Lista de interesse")
    await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('link', { name: 'Lista de interesse' }).click()
    await expect(page).toHaveURL(/\/favorites$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Meus favoritos' })).toBeVisible()
    // Seed: a Ana tem 2 favoritos
    await expect(page.getByText('2 NFTs favoritados')).toBeVisible()

    for (const name of ['Golden Beat #207', 'Sage Nomad #009']) {
      await page.getByRole('button', { name: `Favoritar ${name}` }).click()
      await expect(page.getByRole('link', { name })).toBeHidden()
    }
    await expect(page.getByRole('heading', { name: 'Você ainda não favoritou nenhum NFT' })).toBeVisible()
  })

  test('visitante no coração da barra inferior → login → volta para os favoritos @mobile', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1440) >= 1024, 'a barra inferior só existe no mobile')
    await open(page, '/')
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Favoritos' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('ana@kurio.dev')
    await dialog.getByLabel('Senha', { exact: true }).fill('Kurio@123')
    await dialog.locator('button[type=submit]').click()
    await expect(page).toHaveURL(/\/favorites$/)
    await expect(page.getByText('2 NFTs favoritados')).toBeVisible()
  })
})
