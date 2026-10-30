import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import searchIcon from '@/assets/icons/search.svg'

// Lupa do Header (desktop). Abre um campo; Enter leva ao catálogo com a busca.
// Funciona de qualquer página: no Detalhe ou no Carrinho, buscar leva para a Home.
export function HeaderSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef(false)

  // Devolve o foco para a lupa ao fechar com Esc (quem usa teclado não se perde).
  // Precisa ser num efeito: enquanto o campo está aberto, o botão nem existe na
  // tela. Ele só volta a existir DEPOIS que o React renderiza com open = false.
  useEffect(() => {
    if (!open && returnFocusRef.current) {
      returnFocusRef.current = false
      buttonRef.current?.focus()
    }
  }, [open])

  function close() {
    returnFocusRef.current = true
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        ref={buttonRef}
        type="button"
        aria-label="Buscar NFTs"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="grid size-6 place-items-center"
      >
        <img src={searchIcon} alt="" />
      </button>
    )
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        const q = new FormData(event.currentTarget).get('q')?.toString().trim()
        // Busca nova a partir do Header: começa sem os filtros anteriores.
        void navigate({ to: '/', search: { q: q || undefined }, hash: 'mercado' })
        setOpen(false)
      }}
      className="flex h-8 items-center gap-2 rounded-md border border-border-soft bg-card px-2"
    >
      <img src={searchIcon} alt="" className="size-4" />
      <label htmlFor="header-search" className="sr-only">
        Buscar NFTs
      </label>
      <input
        id="header-search"
        name="q"
        type="search"
        autoFocus // abriu porque o usuário pediu: o foco vai direto para o campo
        placeholder="Buscar NFTs ou coleções"
        onKeyDown={(event) => event.key === 'Escape' && close()}
        onBlur={(event) => !event.currentTarget.value && setOpen(false)}
        className="w-56 bg-transparent text-sm outline-none placeholder:text-text-subtle"
      />
    </form>
  )
}
