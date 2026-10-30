import type { Nft } from '@/contracts/nft'

import { createSeedNfts } from './seed'

// O "banco de dados" do backend falso: um objeto em memória, espelhado no
// localStorage para sobreviver ao F5 (o desafio exige persistência).
// Usuários, carrinhos e pedidos entram aqui nos próximos passos.

const STORAGE_KEY = 'kurio:mock-db'
// Mude este número ao alterar o formato do banco: dados antigos salvos
// no navegador são descartados em vez de quebrar o app.
const SCHEMA_VERSION = 4 // 2: + newsletter · 3: NFTs ganharam rarity · 4: raridade ponderada no seed

export interface DbState {
  schemaVersion: number
  nfts: Nft[]
  newsletter: string[] // e-mails inscritos, já em minúsculas
}

function createInitialState(): DbState {
  return { schemaVersion: SCHEMA_VERSION, nfts: createSeedNfts(), newsletter: [] }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw) as DbState
      if (stored.schemaVersion === SCHEMA_VERSION) return stored
    }
  } catch {
    // localStorage indisponível (aba anônima restrita, Node nos testes) ou JSON corrompido:
    // seguimos só em memória.
  }
  return createInitialState()
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Mesmo motivo acima: sem persistência, mas o app continua funcionando.
  }
}

let state = load()

export function readDb(): Readonly<DbState> {
  return state
}

// Toda escrita passa por aqui, então nunca esquecemos de persistir.
export function writeDb(mutate: (draft: DbState) => void) {
  mutate(state)
  save()
}

// Volta ao cenário conhecido. Usado pelos testes e pelo painel de cenários.
export function resetDb() {
  state = createInitialState()
  save()
}
