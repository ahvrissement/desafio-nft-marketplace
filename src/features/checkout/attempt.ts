import type { CreateOrderInput } from '@/contracts/checkout'

// A "tentativa de compra" em andamento: a Idempotency-Key + o conteúdo enviado.
//
// Por que guardar no sessionStorage: se a aba recarregar no meio do envio (ou o
// servidor demorar além do timeout), não sabemos se o pedido foi criado. Reenviar
// com a MESMA chave e o MESMO conteúdo é seguro: a API devolve o pedido que já
// existia, em vez de criar outro (README: "impedir pedidos duplicados").
const STORAGE_KEY = 'kurio:checkout-attempt'

export interface CheckoutAttempt {
  key: string
  input: CreateOrderInput
}

const sameInput = (a: CreateOrderInput, b: CreateOrderInput) => JSON.stringify(a) === JSON.stringify(b)

export function readAttempt(): CheckoutAttempt | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CheckoutAttempt) : null
  } catch {
    return null
  }
}

// Mesmo conteúdo da tentativa salva → reaproveita a chave. Conteúdo novo
// (outra carteira, cotação nova) → chave nova: é OUTRA compra.
export function startAttempt(input: CreateOrderInput): CheckoutAttempt {
  const saved = readAttempt()
  const attempt = saved && sameInput(saved.input, input) ? saved : { key: crypto.randomUUID(), input }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt))
  } catch {
    // sem sessionStorage: a proteção contra clique duplo continua (botão travado)
  }
  return attempt
}

export function clearAttempt() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // nada salvo
  }
}
