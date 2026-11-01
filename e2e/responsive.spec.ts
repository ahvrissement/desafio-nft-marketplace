import { expect, login, test } from './support'

// README: "teste ao menos 390, 768 e 1440 pixels" e "sem overflow horizontal
// indevido e sem perda de conteúdo com zoom". Os projetos do Playwright já rodam
// em 1440 (desktop) e 390 (mobile); aqui entram o tablet (768) e 320px, que é
// como uma tela de 1280px se comporta com 400% de zoom (WCAG 1.4.10, Reflow).

const SCREENS = ['/', '/nft/emerald-ape-042', '/cart', '/checkout', '/favorites', '/profile', '/profile/wallets']

for (const width of [768, 320]) {
  test(`nenhuma tela vaza para os lados em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await login(page, 'ana', '/nft/emerald-ape-042')
    // Com um item no carrinho, o pagamento mostra o formulário inteiro
    await page.getByRole('button', { name: /Adicionar .* ao carrinho|^Comprar$/ }).filter({ visible: true }).first().click()
    await expect(page).toHaveURL(/./)

    for (const path of SCREENS) {
      await page.goto(path)
      await expect(page.locator('main#conteudo')).toBeVisible()
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${path} em ${width}px`).toBeLessThanOrEqual(0)
    }
  })
}
