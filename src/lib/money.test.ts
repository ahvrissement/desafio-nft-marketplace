import { describe, expect, it } from 'vitest'

import {
  addEth,
  compareEth,
  formatEth,
  fromCents,
  fromWei,
  multiplyEth,
  percentOfEth,
  subtractEth,
  toCents,
  toWei,
} from './money'

describe('money', () => {
  it('converte string ↔ wei sem perder precisão', () => {
    expect(toWei('1.19')).toBe(1_190_000_000_000_000_000n)
    expect(toWei('0.000000000000000001')).toBe(1n)
    expect(fromWei(1_190_000_000_000_000_000n)).toBe('1.19')
    expect(fromWei(1n)).toBe('0.000000000000000001')
  })

  it('sempre mostra pelo menos 2 casas decimais', () => {
    expect(fromWei(toWei('3'))).toBe('3.00')
    expect(fromWei(toWei('0.5'))).toBe('0.50')
  })

  it('rejeita formatos inválidos', () => {
    for (const invalid of ['', '1,19', '-1', '01.5', '1.', '.5', 'abc', '1.0000000000000000001']) {
      expect(() => toWei(invalid), invalid).toThrow()
    }
  })

  it('soma e subtrai onde number erraria', () => {
    expect(0.1 + 0.2).not.toBe(0.3) // o problema que estamos evitando
    expect(addEth('0.1', '0.2')).toBe('0.30')
    expect(addEth('1.19', '1.69', '0.39')).toBe('3.27')
    expect(subtractEth('1.19', '0.2')).toBe('0.99')
  })

  it('multiplica por quantidade inteira', () => {
    expect(1.1 * 3).not.toBe(3.3) // 3.3000000000000003
    expect(multiplyEth('1.1', 3)).toBe('3.30')
    expect(multiplyEth('1.19', 3)).toBe('3.57')
    expect(() => multiplyEth('1.19', 1.5)).toThrow()
  })

  it('calcula porcentagem em basis points', () => {
    expect(percentOfEth('1.19', 250)).toBe('0.02975') // 2,5%
    expect(percentOfEth('2.00', 1000)).toBe('0.20') // 10%
  })

  it('compara valores', () => {
    expect(compareEth('1.19', '1.2')).toBe(-1)
    expect(compareEth('1.10', '1.1')).toBe(0)
    expect(['1.99', '0.39', '1.19'].sort(compareEth)).toEqual(['0.39', '1.19', '1.99'])
  })

  it('converte centavos de ETH (usado pelo slider)', () => {
    expect(toCents('12.30')).toBe(1230)
    expect(toCents('0.02')).toBe(2)
    expect(toCents('1.239')).toBe(123) // trunca
    expect(fromCents(1230)).toBe('12.30')
    expect(fromCents(5)).toBe('0.05')
  })

  it('formata para exibição', () => {
    expect(formatEth('1.190')).toBe('1.19 ETH')
  })
})
