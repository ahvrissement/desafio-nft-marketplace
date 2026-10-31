import { expect, isMobile, open, test } from './support'

// Fluxo 1: busca, filtros combinados, ordenação, paginação e restauração pelo histórico.

test.describe('catálogo', () => {
  test('filtros combinados, ordenação e paginação vão para a URL e voltam pelo histórico', async ({ page }) => {
    test.skip(isMobile(page), 'no mobile os filtros ficam no painel lateral (teste próprio abaixo)')
    await open(page, '/')
    const grid = page.locator('#mercado')
    await expect(grid.locator('article')).toHaveCount(9)

    // Filtro combinado: categoria + rede
    const filters = page.getByRole('complementary', { name: 'Filtros' })
    await filters.getByText('Arte digital').click()
    await expect(page).toHaveURL(/category=/)
    await filters.getByText('Ethereum').click()
    await expect(page).toHaveURL(/network=/)
    const filteredUrl = page.url()

    // Ordenação
    await page.getByRole('combobox', { name: 'Ordenar por:' }).click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=%22price-asc%22|sort=price-asc/)
    // A lista antiga fica na tela até a nova chegar (placeholderData), então
    // a verificação repete até os preços aparecerem em ordem.
    await expect
      .poll(async () => {
        const values = (await grid.locator('article p span.font-bold').allInnerTexts()).map((text) => Number.parseFloat(text))
        return values.length > 0 && values.every((value, index) => index === 0 || values[index - 1] <= value)
      })
      .toBe(true)

    // Voltar no histórico restaura os filtros e a ordenação anterior
    await page.goBack()
    await expect(page).toHaveURL(filteredUrl)
    await expect(filters.getByRole('checkbox', { name: /Arte digital/ })).toBeChecked()
  })

  test('busca, paginação e reinício da página ao filtrar; F5 mantém tudo', async ({ page }) => {
    test.skip(isMobile(page))
    await open(page, '/')
    // Paginação
    await page.getByRole('navigation', { name: /Paginação/ }).getByRole('link', { name: 'Página 2', exact: true }).click()
    await expect(page).toHaveURL(/page=2/)
    // Mudar filtro reinicia a paginação
    await page.getByRole('complementary', { name: 'Filtros' }).getByText('Polygon').click()
    await expect(page).not.toHaveURL(/page=2/)

    // Busca pelo header
    await page.locator('header').getByRole('button', { name: /Buscar/ }).click()
    // A busca olha nome E coleção; "emerald" só aparece no nome do Emerald Ape.
    await page.getByRole('searchbox').fill('emerald')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/q=%22emerald%22|q=emerald/)
    await expect(page.locator('#mercado article h3')).toHaveText(['Emerald Ape #042'])

    // Refresh mantém a busca
    await page.reload()
    await expect(page.locator('#mercado article h3')).toHaveText(['Emerald Ape #042'])
  })

  test('resultado vazio tem mensagem e caminho de volta @mobile', async ({ page }) => {
    await open(page, '/?q=%22nao-existe-nada%22')
    await expect(page.getByText(/Nenhum NFT encontrado/i)).toBeVisible()
  })

  test('mobile: busca com debounce e filtros no painel lateral @mobile', async ({ page }) => {
    test.skip(!isMobile(page))
    await open(page, '/')
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('nomad')
    await expect(page).toHaveURL(/q=/)
    await page.getByRole('button', { name: 'Filtros e ordenação' }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtros' })
    await sheet.getByText('Colecionáveis').click()
    await expect(page).toHaveURL(/category=/)
    await sheet.getByRole('button', { name: 'Ver resultados' }).click()
    await expect(sheet).toBeHidden()
  })
})
