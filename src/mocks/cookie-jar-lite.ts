// Substituto leve do pacote "tough-cookie", usado SÓ pelo MSW (vite.config.ts → resolve.alias).
//
// Por quê: o MSW calcula os cookies para CADA handler em CADA requisição que
// passa pelo service worker (inclusive imagens e scripts). Com o tough-cookie,
// cada consulta valida o domínio contra a lista pública de sufixos (pacote tldts),
// o que custava centenas de ms de CPU no celular, e o par somava ~260 KB de código.
// O app não usa cookies (a sessão vai no header Authorization), então basta o
// essencial: domínio, caminho e expiração.
//
// Implementa só a parte da API que o MSW usa (msw/src/core/utils/cookieStore.ts):
//   new MemoryCookieStore() com .idx · new CookieJar(store) · jar.getCookiesSync(url)
//   jar.setCookie(header, url) · Cookie.fromJSON · cookie.toJSON / toString / key / value

export interface SerializedCookie {
  key: string
  value: string
  domain: string
  path: string
  hostOnly: boolean
  expires: string | null // ISO
}

export class Cookie {
  key: string
  value: string
  domain: string
  path: string
  hostOnly: boolean
  expires: Date | null

  constructor(data: SerializedCookie) {
    this.key = data.key
    this.value = data.value
    this.domain = data.domain
    this.path = data.path
    this.hostOnly = data.hostOnly
    this.expires = data.expires ? new Date(data.expires) : null
  }

  static fromJSON(raw: unknown): Cookie | null {
    if (!raw || typeof raw !== 'object') return null
    const data = raw as Partial<SerializedCookie>
    if (typeof data.key !== 'string' || typeof data.domain !== 'string' || typeof data.path !== 'string') return null
    return new Cookie({
      key: data.key,
      value: String(data.value ?? ''),
      domain: data.domain,
      path: data.path,
      hostOnly: data.hostOnly ?? true,
      expires: data.expires ?? null,
    })
  }

  isExpired(now = Date.now()) {
    return this.expires !== null && this.expires.getTime() <= now
  }

  toJSON(): SerializedCookie {
    return {
      key: this.key,
      value: this.value,
      domain: this.domain,
      path: this.path,
      hostOnly: this.hostOnly,
      expires: this.expires?.toISOString() ?? null,
    }
  }

  toString() {
    return `${this.key}=${this.value}`
  }
}

type Index = Record<string, Record<string, Record<string, Cookie>>>

export class MemoryCookieStore {
  idx: Index = {}
}

// Caminho padrão de um cookie sem "Path": o "diretório" da URL (RFC 6265, 5.1.4).
function defaultPath(pathname: string) {
  const lastSlash = pathname.lastIndexOf('/')
  return lastSlash <= 0 ? '/' : pathname.slice(0, lastSlash)
}

function domainMatches(host: string, cookie: Cookie) {
  if (cookie.hostOnly) return host === cookie.domain
  return host === cookie.domain || host.endsWith(`.${cookie.domain}`)
}

function pathMatches(pathname: string, cookiePath: string) {
  if (pathname === cookiePath) return true
  if (!pathname.startsWith(cookiePath)) return false
  return cookiePath.endsWith('/') || pathname[cookiePath.length] === '/'
}

// Um "Set-Cookie" (ou vários, separados por vírgula antes de um novo "nome=")
function splitSetCookie(header: string) {
  return header.split(/,(?=\s*[^;,=\s]+=)/).map((part) => part.trim()).filter(Boolean)
}

function parseSetCookie(header: string, url: URL): Cookie | null {
  const [pair, ...attributes] = header.split(';')
  const separator = pair.indexOf('=')
  if (separator <= 0) return null
  let domain = url.hostname
  let hostOnly = true
  let path = defaultPath(url.pathname)
  let expires: Date | null = null

  for (const attribute of attributes) {
    const [rawName, ...rest] = attribute.split('=')
    const name = rawName.trim().toLowerCase()
    const value = rest.join('=').trim()
    if (name === 'domain' && value) {
      domain = value.replace(/^\./, '').toLowerCase()
      hostOnly = false
    } else if (name === 'path' && value.startsWith('/')) {
      path = value
    } else if (name === 'max-age' && /^-?\d+$/.test(value)) {
      expires = new Date(Date.now() + Number(value) * 1000)
    } else if (name === 'expires' && expires === null) {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) expires = date
    }
  }

  // Um site não pode gravar cookie para um domínio que não é o dele.
  if (!hostOnly && !domainMatches(url.hostname, new Cookie({ key: '', value: '', domain, path, hostOnly, expires: null }))) return null

  return new Cookie({
    key: pair.slice(0, separator).trim(),
    value: pair.slice(separator + 1).trim(),
    domain,
    path,
    hostOnly,
    expires: expires?.toISOString() ?? null,
  })
}

export class CookieJar {
  #store: MemoryCookieStore

  constructor(store: MemoryCookieStore = new MemoryCookieStore()) {
    this.#store = store
  }

  getCookiesSync(rawUrl: string): Cookie[] {
    const { idx } = this.#store
    // Sem nenhum cookie guardado (o nosso caso): nem analisa a URL.
    if (Object.keys(idx).length === 0) return []

    const url = new URL(rawUrl)
    const now = Date.now()
    const found: Cookie[] = []
    for (const domain in idx) {
      for (const path in idx[domain]) {
        for (const key in idx[domain][path]) {
          const cookie = idx[domain][path][key]
          if (cookie.isExpired(now)) {
            delete idx[domain][path][key]
          } else if (domainMatches(url.hostname, cookie) && pathMatches(url.pathname, cookie.path)) {
            found.push(cookie)
          }
        }
      }
    }
    // Caminhos mais específicos primeiro, como no navegador
    return found.sort((a, b) => b.path.length - a.path.length)
  }

  async setCookie(header: string, rawUrl: string): Promise<void> {
    const url = new URL(rawUrl)
    for (const part of splitSetCookie(header)) {
      const cookie = parseSetCookie(part, url)
      if (!cookie) continue
      const { idx } = this.#store
      idx[cookie.domain] ??= {}
      idx[cookie.domain][cookie.path] ??= {}
      // Cookie já vencido = pedido para apagar
      if (cookie.isExpired()) delete idx[cookie.domain][cookie.path][cookie.key]
      else idx[cookie.domain][cookie.path][cookie.key] = cookie
    }
  }
}
