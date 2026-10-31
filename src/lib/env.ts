// Configuração por variável de ambiente (README: "a camada de mocks deve ser
// ativada por configuração e estar disponível no build de demonstração").
//   VITE_ENABLE_MOCKS=false  → o app chama uma API real em /api (sem MSW).
//   qualquer outro valor     → MSW ligado (o padrão, inclusive no deploy).
export const MOCKS_ENABLED = import.meta.env.VITE_ENABLE_MOCKS !== 'false'
