import type { CheckoutForm } from './form'

// Rascunho do formulário de pagamento (README: tratar expiração "durante o
// checkout, preservando o contexto para retomada").
//
// Se a sessão expira no meio do preenchimento, a guarda da rota leva ao login
// e a página é desmontada. Sem rascunho, a pessoa voltaria a um formulário do
// zero. Com ele, volta exatamente como deixou (e um F5 também não perde nada).
//
// sessionStorage: dura só enquanto a aba está aberta. E o rascunho guarda o
// id do usuário: se OUTRA pessoa entrar nesta aba, ele é ignorado (os dados
// de uma conta nunca aparecem para outra).
const STORAGE_KEY = 'kurio:checkout-draft'

interface Draft {
  userId: string
  values: Partial<CheckoutForm>
}

export function readDraft(userId: string): Partial<CheckoutForm> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const draft = raw ? (JSON.parse(raw) as Draft) : null
    return draft?.userId === userId ? draft.values : null
  } catch {
    return null
  }
}

export function saveDraft(userId: string, values: Partial<CheckoutForm>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ userId, values } satisfies Draft))
  } catch {
    // sem sessionStorage: só não há rascunho
  }
}

// Pedido criado: o rascunho já cumpriu seu papel.
export function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // nada salvo
  }
}
