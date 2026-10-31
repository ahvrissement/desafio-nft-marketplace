/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Precisa vir ANTES do react(): lê src/routes/ e gera src/routeTree.gen.ts.
    // autoCodeSplitting faz cada rota virar um arquivo JS separado (carrega sob demanda),
    // o que ajuda direto na nota de performance do Lighthouse.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // Só o MSW importa o tough-cookie. A versão leve evita validar o domínio
      // contra a lista pública de sufixos a cada handler × requisição (era o
      // maior custo de CPU do mock no celular). Detalhes em cookie-jar-lite.ts.
      'tough-cookie': path.resolve(import.meta.dirname, './src/mocks/cookie-jar-lite.ts'),
    },
  },
  // Saídas do Lighthouse e do Playwright não são código do site. Sem isto, o
  // dev server via cada relatório .html novo como uma "página alterada" e
  // recarregava o navegador a cada 30s, roubando CPU da própria auditoria.
  server: {
    watch: { ignored: ['**/lighthouse/**', '**/test-results/**', '**/playwright-report/**'] },
  },
  // Vitest: testes de unidade (*.test.ts) ficam ao lado do código.
  // Os testes E2E do Playwright (*.spec.ts) vão para e2e/ e não entram aqui.
  test: {
    include: ['src/**/*.test.ts'],
  },
})
