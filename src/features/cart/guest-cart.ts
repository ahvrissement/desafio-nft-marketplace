// Id do carrinho do VISITANTE (quem não entrou). Fica no localStorage para o
// carrinho sobreviver ao F5 e é enviado no header X-Cart-Id. Ao entrar, o
// carrinho dele é juntado ao da conta e este id é descartado.
const STORAGE_KEY = 'kurio:guest-cart'

export function getGuestCartId({ create }: { create: boolean }): string | null {
  try {
    const existing = localStorage.getItem(STORAGE_KEY)
    if (existing || !create) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return null
  }
}

export function clearGuestCartId() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // sem localStorage não havia id salvo
  }
}
