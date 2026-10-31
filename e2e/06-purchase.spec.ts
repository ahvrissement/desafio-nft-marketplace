import { expectReceipt, openReview, payButton } from './checkout-helpers'
import { expect, isMobile, login, open, test } from './support'

// Fluxo 6: compra completa, do catálogo ao recibo confirmado.

test('compra completa: catálogo → detalhe → carrinho → pagamento → recibo @mobile', async ({ page }) => {
  await login(page, 'ana')
  await open(page, '/')
  await page.locator('#mercado article').filter({ hasText: 'Emerald Ape #042' }).getByRole('link').click()
  await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
  await page.getByRole('button', { name: isMobile(page) ? 'Comprar NFT' : 'Comprar', exact: true }).click()
  await expect(page).toHaveURL(/\/cart$/)
  await page.getByRole('link', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/checkout$/)

  // Validação do formulário antes da revisão
  await page.getByLabel('Nome ENS').fill('sem-sufixo')
  await page.getByRole('button', { name: 'Confirmar compra' }).last().click()
  await expect(page.getByText('Use um nome ENS terminado em .eth.')).toBeVisible()
  await page.getByLabel('Nome ENS').fill('ana.kurio.eth')

  const dialog = await openReview(page)
  await expect(payButton(dialog)).toHaveText('Confirmar e pagar 1.206 ETH')
  await payButton(dialog).click()

  await expectReceipt(page)
  const receipt = page.getByRole('article', { name: 'Seus NFTs agora estão na sua carteira' })
  await expect(receipt.getByText('Emerald Ape #042')).toBeVisible()
  await expect(receipt.getByText('1.206 ETH').first()).toBeVisible()
  await expect(receipt.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /etherscan\.io\/tx\/0x/)

  // Só o que foi comprado saiu do carrinho
  await open(page, '/cart')
  await expect(page.getByRole('heading', { name: 'Seu carrinho está vazio' })).toBeVisible()
})
