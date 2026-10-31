// Senhas no banco falso: NUNCA em texto puro (o README exige).
// Guardamos sha256(salt + ":" + senha). O salt é aleatório por usuário: duas
// pessoas com a mesma senha ficam com hashes diferentes, e uma tabela pronta
// de "hash → senha" não serve para nada.
//
// Num backend real usaríamos um algoritmo LENTO de propósito (bcrypt, argon2).
// SHA-256 é rápido demais para senhas, mas aqui basta para não guardar em claro.

const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  return toHex(await crypto.subtle.digest('SHA-256', data))
}

export function randomToken(bytes = 24): string {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer)
}
