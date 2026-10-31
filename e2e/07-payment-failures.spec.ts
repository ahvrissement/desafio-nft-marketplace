import { expectReceipt, openReview, payButton } from './checkout-helpers'
import { buy, expect, login, open, setScenarios, test } from './support'

// Fluxo 7: falha de pagamento, clique repetido e timeout com recuperação do mesmo pedido.

test.describe('falhas no pagamento', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'ana')
    await buy(page, 'emerald-ape-042')
  })

  test('pagamento recusado: tela de recusa e itens preservados', async ({ page }) => {
    await setScenarios(page, { payment: 'decline' })
    const dialog = await openReview(page)
    await payButton(dialog).click()
    await expect(page.getByText('Pagamento recusado')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Seus itens continuam no carrinho.')).toBeVisible()
    await open(page, '/cart')
    await expect(page.locator('table').getByRole('link', { name: 'Emerald Ape #042' })).toBeVisible()
  })

  test('clique repetido cria um pedido só', async ({ page }) => {
    const posts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) posts.push(request.headers()['idempotency-key'])
    })
    const dialog = await openReview(page)
    await payButton(dialog).dblclick()
    await expectReceipt(page)
    expect(posts).toHaveLength(1)
  })

  test('timeout depois de criar: reenvio com a MESMA chave recupera o mesmo pedido', async ({ page }) => {
    test.setTimeout(90_000)
    const posts: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/orders')) posts.push(request.headers()['idempotency-key'])
    })
    await setScenarios(page, { orderTimeout: true })
    const dialog = await openReview(page)
    await payButton(dialog).click()
    await expect(page).toHaveURL(/\/orders\//, { timeout: 40_000 })
    await setScenarios(page, { orderTimeout: false })
    await expectReceipt(page)
    expect(posts.length).toBeGreaterThanOrEqual(2)
    expect(new Set(posts).size).toBe(1) // todas as tentativas com a mesma Idempotency-Key
  })

  test('carteira recusa a conexão: mensagem e nenhum pedido', async ({ page }) => {
    await setScenarios(page, { walletConnect: 'decline' })
    const dialog = await openReview(page)
    await payButton(dialog).click()
    await expect(dialog.getByRole('alert')).toHaveText(/A carteira recusou a conexão/)
    await expect(page).toHaveURL(/\/checkout$/)
  })
})
