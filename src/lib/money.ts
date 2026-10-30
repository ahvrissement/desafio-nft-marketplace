// Aritmética exata para valores em ETH.
//
// Por que não usar number? Porque o JavaScript guarda números em ponto flutuante
// binário, e muitos decimais não têm representação exata:
//   0.1 + 0.2  === 0.30000000000000004
//   1.1 * 3    === 3.3000000000000003
//
// A estratégia: na API e no estado, todo valor em ETH é uma STRING decimal ("1.19").
// Para fazer contas, convertemos para wei (1 ETH = 10^18 wei) usando BigInt, que é
// um inteiro de tamanho arbitrário. Inteiros não perdem precisão. Depois voltamos
// para string.

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)

// "0", "12", "1.19", "0.000000000000000001". Sem sinal, sem zeros à esquerda, no máximo 18 casas.
export const ETH_AMOUNT_REGEX = /^(0|[1-9]\d*)(\.\d{1,18})?$/

export function isEthAmount(value: string): boolean {
  return ETH_AMOUNT_REGEX.test(value)
}

// "1.19" → 1190000000000000000n
export function toWei(amount: string): bigint {
  if (!isEthAmount(amount)) {
    throw new Error(`Valor em ETH inválido: "${amount}"`)
  }
  const [integer, fraction = ''] = amount.split('.')
  return BigInt(integer) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

// 1190000000000000000n → "1.19"
// Sempre com pelo menos 2 casas ("3" vira "3.00"), como no Figma.
export function fromWei(wei: bigint): string {
  const sign = wei < 0n ? '-' : ''
  const abs = wei < 0n ? -wei : wei
  const integer = abs / WEI_PER_ETH
  const fraction = (abs % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${sign}${integer}.${fraction.padEnd(2, '0')}`
}

export function addEth(...amounts: string[]): string {
  return fromWei(amounts.reduce((total, amount) => total + toWei(amount), 0n))
}

export function subtractEth(a: string, b: string): string {
  return fromWei(toWei(a) - toWei(b))
}

// Preço unitário × quantidade. A quantidade é sempre inteira (regra do desafio).
export function multiplyEth(amount: string, quantity: number): string {
  if (!Number.isSafeInteger(quantity)) {
    throw new Error(`Quantidade precisa ser inteira: ${quantity}`)
  }
  return fromWei(toWei(amount) * BigInt(quantity))
}

// Porcentagem em basis points (bps): 100 bps = 1%, 250 bps = 2,5%.
// Usar bps evita porcentagens com vírgula (2.5) e mantém tudo inteiro.
// A divisão de BigInt trunca; a perda máxima é 1 wei (0,000000000000000001 ETH).
export function percentOfEth(amount: string, bps: number): string {
  if (!Number.isSafeInteger(bps)) {
    throw new Error(`Basis points precisam ser inteiros: ${bps}`)
  }
  return fromWei((toWei(amount) * BigInt(bps)) / 10_000n)
}

// -1 se a < b, 0 se iguais, 1 se a > b. Serve direto como comparador de sort.
export function compareEth(a: string, b: string): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff < 0n ? -1 : diff > 0n ? 1 : 0
}

// Centavos de ETH (0.01) ↔ string. O slider de preço trabalha com inteiros
// (2 a 1230), porque sliders não lidam bem com strings decimais.
const WEI_PER_CENT = WEI_PER_ETH / 100n

// "1.239" → 123 (trunca o que passar de 2 casas)
export function toCents(amount: string): number {
  return Number(toWei(amount) / WEI_PER_CENT)
}

// 123 → "1.23"
export function fromCents(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Centavos precisam ser inteiros: ${cents}`)
  }
  return fromWei(BigInt(cents) * WEI_PER_CENT)
}

export function formatEth(amount: string): string {
  return `${fromWei(toWei(amount))} ETH`
}
