import { describe, expect, it } from 'vitest'

import { Cookie, CookieJar, MemoryCookieStore } from './cookie-jar-lite'

describe('cookie-jar-lite (substituto do tough-cookie no MSW)', () => {
  it('guarda e devolve por domínio e caminho', async () => {
    const jar = new CookieJar(new MemoryCookieStore())
    await jar.setCookie('tema=escuro; Path=/api', 'https://kurio.dev/api/nfts')
    expect(jar.getCookiesSync('https://kurio.dev/api/cart').map(String)).toEqual(['tema=escuro'])
    expect(jar.getCookiesSync('https://kurio.dev/carrinho')).toEqual([])
    expect(jar.getCookiesSync('https://outro.dev/api/cart')).toEqual([])
  })

  it('Domain vale para subdomínios; sem Domain, só para o próprio host', async () => {
    const jar = new CookieJar()
    await jar.setCookie('a=1; Domain=kurio.dev; Path=/', 'https://kurio.dev/')
    await jar.setCookie('b=2; Path=/', 'https://kurio.dev/')
    expect(jar.getCookiesSync('https://api.kurio.dev/').map(String)).toEqual(['a=1'])
    // Um site não grava cookie para o domínio de outro
    await jar.setCookie('c=3; Domain=outro.dev', 'https://kurio.dev/')
    expect(jar.getCookiesSync('https://outro.dev/')).toEqual([])
  })

  it('respeita Max-Age e apaga com cookie vencido', async () => {
    const jar = new CookieJar()
    await jar.setCookie('sessao=x; Path=/; Max-Age=60', 'https://kurio.dev/')
    expect(jar.getCookiesSync('https://kurio.dev/')).toHaveLength(1)
    await jar.setCookie('sessao=x; Path=/; Max-Age=0', 'https://kurio.dev/')
    expect(jar.getCookiesSync('https://kurio.dev/')).toEqual([])
  })

  it('vários Set-Cookie no mesmo header, inclusive com vírgula no Expires', async () => {
    const jar = new CookieJar()
    await jar.setCookie('a=1; Path=/; Expires=Wed, 21 Oct 2099 07:28:00 GMT, b=2; Path=/', 'https://kurio.dev/')
    expect(jar.getCookiesSync('https://kurio.dev/').map(String).sort()).toEqual(['a=1', 'b=2'])
  })

  it('ida e volta pelo JSON (o MSW persiste no localStorage)', () => {
    const cookie = Cookie.fromJSON({ key: 'a', value: '1', domain: 'kurio.dev', path: '/', hostOnly: true, expires: null })
    expect(cookie && Cookie.fromJSON(cookie.toJSON())?.toString()).toBe('a=1')
    expect(Cookie.fromJSON({ value: 'sem chave' })).toBeNull()
  })
})
