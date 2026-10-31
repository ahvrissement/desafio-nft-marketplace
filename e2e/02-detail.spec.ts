import { expect, open, test } from './support'

// Fluxo 2: acesso direto ao detalhe e tratamento de recurso inexistente.

test.describe('detalhe do NFT', () => {
  test('acesso direto mostra o NFT, com edição da URL e limite de quantidade @mobile', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042?edition=1-10')
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page).toHaveTitle('Emerald Ape #042 | Kurio')
    await expect(page.getByRole('radio', { name: '1/10' })).toBeChecked()
    await expect(page.getByText('Restam 4 de 10 nesta edição.')).toBeVisible()
    // Edição esgotada: desabilitada (o leitor de tela ouve "esgotada")
    await expect(page.getByRole('radio', { name: /1\/1 \(esgotada\)/ })).toBeDisabled()
  })

  test('limite de quantidade: o "+" trava no estoque sem perder o foco', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042?edition=1-10')
    const stepper = page.locator('section[aria-labelledby="nft-titulo"]').getByRole('group', { name: 'Quantidade' })
    const plus = stepper.getByRole('button', { name: 'Aumentar quantidade' })
    for (let i = 0; i < 3; i++) await plus.click()
    await expect(stepper.locator('output')).toHaveText('4')
    await expect(plus).toHaveAttribute('aria-disabled', 'true')
    await plus.focus()
    await page.keyboard.press('Enter')
    await expect(plus).toBeFocused()
    // Desktop e mobile têm cada um a sua mensagem (uma fica escondida): vale a visível.
    await expect(page.getByText('Você já escolheu todas as 4 unidades disponíveis.').filter({ visible: true })).toBeVisible()
  })

  test('NFT inexistente → página de não encontrado @mobile', async ({ page }) => {
    await open(page, '/nft/nao-existe-mesmo')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Explorar o mercado' })).toBeVisible()
  })

  test('rota inexistente → 404 geral', async ({ page }) => {
    await open(page, '/qualquer-coisa')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
