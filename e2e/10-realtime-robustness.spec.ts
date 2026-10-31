import { openReview, payButton } from './checkout-helpers'
import { buy, devApi, expect, login, open, test, updateNft } from './support'

// Fluxo 10: eventos duplicados ou antigos, desconexão e retomada de pedido pendente.

const price = (page: import('@playwright/test').Page) =>
  page.locator('section[aria-labelledby="nft-titulo"] p').filter({ hasText: 'Preço' }).first()

test.describe('robustez do tempo real', () => {
  test('evento duplicado e evento antigo não regridem o estado', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await expect(price(page)).toContainText('1.19 ETH')
    await updateNft(page, { nftId: 'emerald-ape-042', editionId: '1-50', price: '1.25' })
    await expect(price(page)).toContainText('1.25 ETH')

    await devApi(page, 'POST', '/__dev/realtime', { action: 'duplicate' })
    await devApi(page, 'POST', '/__dev/realtime', { action: 'stale' })
    await page.waitForTimeout(800) // dá tempo de os eventos chegarem
    await expect(price(page)).toContainText('1.25 ETH')
  })

  test('desconexão: evento perdido é reconciliado pela REST ao reconectar', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await expect(price(page)).toContainText('1.19 ETH')
    await devApi(page, 'POST', '/__dev/realtime', { action: 'disconnect' })
    // Com a conexão caída, este evento se perde; a reconexão busca o estado atual.
    await updateNft(page, { nftId: 'emerald-ape-042', editionId: '1-50', price: '1.30' })
    await expect(price(page)).toContainText('1.30 ETH', { timeout: 10_000 })
  })

  test('pedido pendente: F5 retoma o acompanhamento sem criar outra compra', async ({ page }) => {
    const posts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) posts.push(request.url())
    })
    await login(page, 'ana')
    await buy(page, 'emerald-ape-042')
    const dialog = await openReview(page)
    await payButton(dialog).click()
    await expect(page.getByRole('heading', { name: 'Aguardando a confirmação da rede…' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' })).toBeVisible({ timeout: 15_000 })
    expect(posts).toHaveLength(1)
  })
})
