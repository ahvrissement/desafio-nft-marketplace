import { openReview, payButton, expectReceipt } from './checkout-helpers'
import { buy, expect, login, test, updateNft } from './support'

// Fluxo 9: alteração de preço/disponibilidade via Socket.IO durante o checkout.
// (O evento passa pelo socket.io-client do app: o teste só muda o backend falso.)

test.describe('tempo real no checkout', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ana')
    await buy(page, 'emerald-ape-042')
  })

  test('carrinho aberto: preço muda → aviso e resumo atualizados', async ({ page }) => {
    await expect(page.getByText('1.206 ETH').first()).toBeVisible()
    await updateNft(page, { nftId: 'emerald-ape-042', editionId: '1-50', price: '1.30' })
    await expect(page.getByText('o preço mudou de 1.19 ETH para 1.30 ETH.')).toBeVisible()
    await expect(page.getByText('1.316 ETH').first()).toBeVisible()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'mudou de preço ou disponibilidade' })).toBeVisible()
  })

  test('revisão aberta: preço muda → pagar trava até nova confirmação', async ({ page }) => {
    const dialog = await openReview(page)
    await updateNft(page, { nftId: 'emerald-ape-042', editionId: '1-50', price: '1.50' })
    await expect(dialog.getByText('Os valores mudaram desde a sua revisão.')).toBeVisible()
    await expect(payButton(dialog)).toBeDisabled()
    await dialog.getByRole('button', { name: 'Ver os novos valores' }).click()
    await expect(payButton(dialog)).toHaveText('Confirmar e pagar 1.516 ETH')
    await payButton(dialog).click()
    await expectReceipt(page)
  })

  test('edição esgota durante o checkout: compra bloqueada', async ({ page }) => {
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Seus NFTs' })).toBeVisible()
    await updateNft(page, { nftId: 'emerald-ape-042', editionId: '1-50', available: 0 })
    await page.reload() // cotação nova (a página de checkout lê a cotação ao abrir)
    await expect(page.getByRole('alert').filter({ hasText: 'esgotou' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' }).last()).toBeDisabled()
  })
})
