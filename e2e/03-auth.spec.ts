import { devApi, expect, login, open, test, USERS } from './support'

// Fluxo 3: cadastro, login, expiração de sessão, logout e troca de usuário.

test.describe('conta e sessão', () => {
  test('cadastro valida, trata conflito e entra na conta', async ({ page }) => {
    await open(page, '/?auth=cadastro')
    const dialog = page.getByRole('dialog')
    await dialog.locator('button[type=submit]').click()
    await expect(dialog.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')

    await dialog.getByLabel('Nome de usuário').fill('Carla Teste')
    await dialog.getByLabel('E-mail').fill(USERS.ana.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('segredo123')
    await dialog.getByLabel('Confirmar senha').fill('segredo123')
    await dialog.locator('button[type=submit]').click()
    // Conflito vindo da API, no campo certo e com o foco nele
    await expect(dialog.getByText('Este e-mail já está cadastrado. Entre ou use outro e-mail.')).toBeVisible()
    await expect(dialog.getByLabel('E-mail')).toBeFocused()

    await dialog.getByLabel('E-mail').fill('carla@kurio.dev')
    await dialog.locator('button[type=submit]').click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('header').getByRole('button', { name: 'Conta de Carla Teste' })).toBeVisible()
  })

  test('login com erro, sucesso, sessão após F5 e retorno à página anterior', async ({ page }) => {
    await open(page, '/nft/sage-nomad-009?auth=entrar')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(USERS.ana.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('errada123')
    await dialog.locator('button[type=submit]').click()
    await expect(dialog.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')

    await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await dialog.locator('button[type=submit]').click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/nft\/sage-nomad-009$/) // continua na mesma página
    await page.reload()
    await expect(page.locator('header').getByRole('button', { name: /Conta de Ana/ })).toBeVisible()
  })

  test('sessão expirada durante a navegação: aviso, dados privados limpos, retomada', async ({ page }) => {
    await login(page, 'ana', '/nft/emerald-ape-042')
    await devApi(page, 'POST', '/__dev/expire-sessions')
    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Sua sessão expirou' })).toBeVisible()
    await expect(page.locator('header').getByRole('button', { name: 'Entrar' })).toBeVisible()
    // O botão do aviso reabre o login NA MESMA página
    await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Entrar' }).click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042\?auth=entrar/)
  })

  test('logout e troca de usuário não vazam dados da conta anterior', async ({ page }) => {
    await login(page, 'ana', '/nft/sage-nomad-009')
    const favorite = page.locator('section[aria-labelledby="nft-titulo"]').getByRole('button', { name: /Favorit/ })
    await expect(favorite).toHaveText('Favoritado') // favorito do seed da Ana

    await page.locator('header').getByRole('button', { name: /Conta de/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(favorite).toHaveText('Favoritar')
    expect(await page.evaluate(() => localStorage.getItem('kurio:session-token'))).toBeNull()

    await login(page, 'bruno', '/nft/sage-nomad-009')
    await expect(favorite).toHaveText('Favoritar') // o Bruno não vê o favorito da Ana
  })

  test('rota privada sem login → login e volta para ela @mobile', async ({ page }) => {
    await open(page, '/checkout')
    await expect(page).toHaveURL(/\/cart\?auth=entrar&redirect=%2Fcheckout/)
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(USERS.bruno.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
    await dialog.locator('button[type=submit]').click()
    await expect(page).toHaveURL(/\/checkout$/)
  })
})
