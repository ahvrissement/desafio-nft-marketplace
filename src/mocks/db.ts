import type { Nft } from '@/contracts/nft'

import { createSeedNfts, createSeedUsers } from './seed'

// O "banco de dados" do backend falso: um objeto em memória, espelhado no
// localStorage para sobreviver ao F5 (o desafio exige persistência).
// Carrinhos e pedidos entram aqui nos próximos passos.

const STORAGE_KEY = 'kurio:mock-db'
// Mude este número ao alterar o formato do banco: dados antigos salvos
// no navegador são descartados em vez de quebrar o app.
const SCHEMA_VERSION = 6 // 2: + newsletter · 3: NFTs ganharam rarity · 4: raridade ponderada no seed · 5: nota 4,8 do Emerald Ape · 6: usuários, sessões e favoritos

export interface DbUser {
  id: string
  name: string
  email: string // sempre em minúsculas
  passwordSalt: string
  passwordHash: string // sha256(salt + ":" + senha). A senha em si nunca é guardada.
  avatarUrl: string | null
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: string // ISO
}

export interface DbState {
  schemaVersion: number
  nfts: Nft[]
  newsletter: string[] // e-mails inscritos, já em minúsculas
  users: DbUser[]
  sessions: DbSession[]
  favorites: Record<string, string[]> // userId → ids de NFTs
}

function createInitialState(): DbState {
  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: createSeedNfts(),
    newsletter: [],
    users: createSeedUsers(),
    sessions: [],
    // A Ana já tem dois favoritos: dá para ver a lista logo no primeiro login.
    favorites: { 'user-ana': ['sage-nomad-009', 'golden-beat-207'] },
  }
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
