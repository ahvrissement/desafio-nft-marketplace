import { expect, open, test } from './support'

// Fluxo 11: navegação por teclado, foco de diálogos e validação de formulários.

test.describe('teclado e foco', () => {
  test('primeiro Tab é o "pular para o conteúdo"', async ({ page }) => {
    await open(page, '/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('modal de login: foco no 1º campo, preso no modal, Esc fecha e devolve o foco', async ({ page }) => {
    await open(page, '/')
    const trigger = page.locator('header').getByRole('button', { name: 'Entrar' })
    await trigger.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('E-mail')).toBeFocused()
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role=dialog]')))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('validação: erros ligados aos campos e foco no primeiro inválido', async ({ page }) => {
    await open(page, '/?auth=entrar')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('nao-e-email')
    await dialog.locator('button[type=submit]').click()
    const email = dialog.getByLabel('E-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(email).toHaveAccessibleDescription('Informe um e-mail válido.')
    await expect(email).toBeFocused()
  })

  test('abas do detalhe pelo teclado (setas) e zoom com foco devolvido', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await page.getByRole('tab', { name: 'Detalhes do NFT' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('tab', { name: /Avaliações/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tabpanel').locator('article')).toHaveCount(19)

    const zoom = page.getByRole('button', { name: 'Ampliar imagem' })
    await zoom.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(zoom).toBeFocused()
  })

  test('filtros com o teclado (espaço marca a caixa)', async ({ page }) => {
    await open(page, '/')
    const checkbox = page.getByRole('complementary', { name: 'Filtros' }).getByRole('checkbox', { name: /Música/ })
    await checkbox.focus()
    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()
    await expect(page).toHaveURL(/category=/)
  })
})
