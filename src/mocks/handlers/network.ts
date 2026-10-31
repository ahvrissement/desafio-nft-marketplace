import { delay, http, HttpResponse } from 'msw'

import { readDb } from '../db'
import { API, apiError } from '../utils'

// Condições de rede simuladas (README: "lentidão, latência variável, timeouts,
// indisponibilidade de conexão e respostas HTTP de erro").
//
// Este handler fica PRIMEIRO na lista. Ele aplica o cenário ativo e, quando não
// responde nada (return sem valor), o MSW passa a requisição para o próximo
// handler, o de verdade. É um "middleware" de rede.

// Sorteio com SEMENTE fixa: a latência "variável" é aleatória, mas a mesma
// sequência se repete a cada execução (cenário reproduzível).
let seed = 7
function nextRandom() {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
  return seed / 2_147_483_648
}
export function resetNetworkRandom() {
  seed = 7
}

export const networkHandlers = [
  http.all(`${API}/*`, async ({ request }) => {
    // As rotas de bastidor nunca falham: o painel precisa conseguir desligar o cenário.
    if (new URL(request.url).pathname.includes('/api/__dev/')) return

    const { latency, failure } = readDb().scenarios
    if (latency === 'slow') await delay(2_500)
    // 0,1s a 3s: duas buscas seguidas podem voltar em ordem trocada.
    if (latency === 'variable') await delay(100 + Math.round(nextRandom() * 2_900))

    switch (failure) {
      case 'offline':
        // Erro de rede de verdade (o fetch rejeita, como sem internet).
        return HttpResponse.error()
      case 'server-error':
        return apiError(500, 'INTERNAL_ERROR', 'Erro interno no servidor (cenário simulado).')
      case 'unavailable':
        return apiError(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível (cenário simulado).')
      case 'timeout':
        // Mais que o timeout do cliente (10s): o Axios desiste antes.
        await delay(12_000)
        return apiError(504, 'SERVICE_UNAVAILABLE', 'O servidor demorou demais.')
      case 'none':
        return // segue para o handler de verdade
    }
  }),
]
