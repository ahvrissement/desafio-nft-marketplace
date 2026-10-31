// Onde o token da sessão mora no navegador.
//
// localStorage (e não sessionStorage) porque o README pede que a sessão
// sobreviva ao F5 E a abrir o site em outra aba. O lado ruim conhecido: um
// script malicioso na página (XSS) conseguiria ler o token. Num backend real,
// o ideal seria um cookie httpOnly, que o JavaScript não lê; com MSW não existe
// servidor para emitir esse cookie. Documentado no ARCHITECTURE.md.
const STORAGE_KEY = 'kurio:session-token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Sem localStorage a sessão dura até o F5. O app continua funcionando.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // idem
  }
}

export const TOKEN_STORAGE_KEY = STORAGE_KEY
