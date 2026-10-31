import { expect, type Page } from '@playwright/test'

import { isMobile } from './support'

// Abre o checkout e a revisão do pedido (o formulário já vem preenchido).
export async function openReview(page: Page) {
  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Seus NFTs' })).toBeVisible()
  const confirm = page.getByRole('button', { name: 'Confirmar compra' })
  await (isMobile(page) ? confirm.last() : page.locator('aside').getByRole('button', { name: 'Confirmar compra' })).click()
  const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}

export const payButton = (dialog: import('@playwright/test').Locator) => dialog.getByRole('button', { name: /Confirmar e pagar/ })

export async function expectReceipt(page: Page) {
  await expect(page).toHaveURL(/\/orders\//)
  await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
}
