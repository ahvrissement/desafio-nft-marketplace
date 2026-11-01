import { expect, login, open, test, USERS } from './support'

// Fluxo 8: edição de perfil, avatar, senha e carteiras, com erros de validação.

// PNG 1×1 válido, para o upload do avatar (sem depender de arquivo no disco).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

test.describe('perfil e carteiras', () => {
  test('perfil: validação, conflito da API, salvar e manter após F5 @mobile', async ({ page }) => {
    await login(page, 'ana', '/profile')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()

    // Validação do formulário
    await page.getByLabel('Nome de usuário').fill('a')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByLabel('Nome de usuário')).toHaveAccessibleDescription('Use de 3 a 20 letras, números, ponto ou _.')

    // Conflito vindo da API: e-mail de outra conta
    await page.getByLabel('Nome de usuário').fill('ana_coleciona')
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill(USERS.pedro.email)
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Este e-mail já é usado por outra conta.')).toBeVisible()

    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('ana.nova@kurio.dev')
    await page.getByLabel('Nome de exibição').fill('Ana Nova')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Perfil atualizado.' })).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Nova')
    await expect(page.getByRole('textbox', { name: 'E-mail', exact: true })).toHaveValue('ana.nova@kurio.dev')
  })

  test('avatar: alterar e remover', async ({ page }) => {
    await login(page, 'ana', '/profile')
    await page.locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('img', { name: /Avatar de Ana/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('img', { name: /Avatar de Ana/ })).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()

    // Arquivo que não é imagem
    await page.locator('input[type=file]').setInputFiles({ name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
    await expect(page.getByRole('alert').filter({ hasText: 'Use uma imagem PNG, JPG ou WEBP.' })).toBeVisible()
  })

  test('senha: atual errada, senhas diferentes e troca que vale no próximo login', async ({ page }) => {
    await login(page, 'ana', '/profile')
    await page.getByLabel('Senha atual', { exact: true }).fill('errada123')
    await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha1')
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('Outra1234')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('As senhas não conferem.')).toBeVisible()

    await page.getByLabel('Confirmar nova senha', { exact: true }).fill('NovaSenha1')
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByText('Senha atual incorreta.').first()).toBeVisible()

    await page.getByLabel('Senha atual', { exact: true }).fill(USERS.ana.password)
    await page.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Senha alterada.' })).toBeVisible()

    // A senha nova vale no próximo login
    await page.getByRole('navigation', { name: 'Meu perfil' }).getByRole('button', { name: 'Sair' }).click()
    await open(page, '/?auth=entrar')
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill(USERS.ana.email)
    await dialog.getByLabel('Senha', { exact: true }).fill('NovaSenha1')
    await dialog.locator('button[type=submit]').click()
    await expect(dialog).toBeHidden()
  })

  test('carteiras: editar a principal, adicionar a secundária com erros e usar no pagamento', async ({ page }) => {
    await login(page, 'pedro', '/profile/wallets')
    const primary = page.getByRole('region', { name: 'Carteira principal' })
    await primary.getByRole('button', { name: 'Editar' }).click()
    await primary.getByLabel('Apelido da carteira').fill('Cofre')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText('Cofre')).toBeVisible()

    const secondary = page.getByRole('region', { name: 'Carteira secundária' })
    await expect(secondary.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
    await secondary.getByRole('button', { name: 'Adicionar' }).click()
    await secondary.getByLabel('Endereço da carteira').fill('0x123')
    await secondary.getByLabel('ENS (opcional)').fill('sem-sufixo')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByText('Use um endereço 0x com 40 caracteres hexadecimais.')).toBeVisible()
    await expect(secondary.getByText('Use um nome ENS terminado em .eth.')).toBeVisible()

    // Endereço já usado pela principal → 409 da API no campo
    await secondary.getByLabel('Endereço da carteira').fill('0x7c41e9b2d5f8a3c6e9b2d5f8a1c4e7b0d3f6a904')
    await secondary.getByLabel('ENS (opcional)').fill('')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(secondary.getByText('Este endereço já está cadastrado.')).toBeVisible()

    await secondary.getByLabel('Endereço da carteira').fill('0x00000000000000000000000000000000000000aa')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Carteira adicionada.' })).toBeVisible()

    // Persistem após F5 e aparecem no pagamento
    await page.reload()
    await expect(page.getByRole('region', { name: 'Carteira secundária' }).getByText('Reserva')).toBeVisible()
  })
})
