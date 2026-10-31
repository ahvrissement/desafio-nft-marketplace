import { MOCKS_ENABLED } from './env'

// "O mock já está atendendo?" A tela é desenhada SEM esperar o MSW (no celular,
// baixar e executar o mock antes de pintar atrasava tudo). Quem espera é só
// quem vai para a rede: o axios, antes de cada requisição, e o socket do
// tempo real, antes de conectar. Sem isso, uma chamada feita cedo escaparia
// para a rede real e daria 404.
let markReady: () => void = () => {}
export const mocksReady: Promise<void> = MOCKS_ENABLED
  ? new Promise((resolve) => (markReady = resolve))
  : Promise.resolve()

export function setMocksReady() {
  markReady()
  // Sinal visível de fora (os testes E2E esperam por ele antes de usar /api/__dev)
  document.documentElement.dataset.mocks = 'ready'
}
