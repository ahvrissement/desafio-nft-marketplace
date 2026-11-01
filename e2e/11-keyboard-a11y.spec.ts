import type { Page } from '@playwright/test'

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

// Carrossel do Hero: troca automática que para sozinha (WCAG 2.2.2) e setas no desktop.
// page.clock: o relógio é falso, então "6 segundos" passam na hora.
test.describe('carrossel do Hero', () => {
  const hero = (page: Page) => page.getByRole('region', { name: 'Destaques da Kurio', exact: true })
  const current = (page: Page) => hero(page).locator('button[aria-current="true"]')

  test('troca sozinha a cada 6s, pausa com o mouse em cima e retoma ao sair', async ({ page }) => {
    await page.clock.install()
    await open(page, '/')
    await expect(current(page)).toHaveAccessibleName('Slide 1 de 3')

    await page.clock.runFor(6_000)
    await expect(current(page)).toHaveAccessibleName('Slide 2 de 3')

    // Mouse em cima: para de girar
    await hero(page).hover()
    await page.clock.runFor(12_000)
    await expect(current(page)).toHaveAccessibleName('Slide 2 de 3')

    // Mouse fora: volta a girar
    await page.mouse.move(0, 0)
    await page.clock.runFor(6_000)
    await expect(current(page)).toHaveAccessibleName('Slide 3 de 3')
  })

  test('setas trocam de slide, dão a volta e desligam a troca automática', async ({ page }) => {
    await page.clock.install()
    await open(page, '/')
    await hero(page).getByRole('button', { name: 'Slide anterior' }).click()
    await expect(current(page)).toHaveAccessibleName('Slide 3 de 3')
    await hero(page).getByRole('button', { name: 'Próximo slide' }).click()
    await expect(current(page)).toHaveAccessibleName('Slide 1 de 3')

    // Quem escolheu o slide não é atropelado: nada gira mais, nem com o mouse fora
    await page.mouse.move(0, 0)
    await page.clock.runFor(20_000)
    await expect(current(page)).toHaveAccessibleName('Slide 1 de 3')
  })

  test('com "reduzir movimento" no sistema, não gira sozinho @mobile', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    await open(page, '/')
    await page.clock.runFor(20_000)
    await expect(current(page)).toHaveAccessibleName('Slide 1 de 3')
  })
})
