import { expect, login, open, test } from './support'

// README: "acesso direto e refresh das rotas devem funcionar no ambiente publicado".
// Numa SPA, /nft/x não existe como arquivo: o servidor precisa devolver o index.html
// (vercel.json → rewrites; o vite preview faz o mesmo). E os arquivos de verdade
// (o service worker do mock) NÃO podem ser engolidos por esse rewrite.

test.describe('rotas no ambiente publicado', () => {
  test('o service worker do mock é servido como JavaScript, não como a página', async ({ request }) => {
    const response = await request.get('/mockServiceWorker.js')
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('javascript')
    expect(await response.text()).toContain('Mock Service Worker')
  })

  test('acesso direto e F5 em rotas públicas, privadas e inexistentes @mobile', async ({ page }) => {
    await open(page, '/nft/sage-nomad-009?edition=1-10')
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
    await expect(page).toHaveURL(/edition=1-10/) // o estado da URL sobrevive ao F5

    await login(page, 'ana', '/profile/wallets')
    await page.reload()
    await expect(page).toHaveURL(/\/profile\/wallets$/)
    await expect(page.getByRole('heading', { name: 'Carteiras', exact: true })).toBeVisible()

    await open(page, '/uma-rota-que-nao-existe')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/não encontrada/i)
  })
})
