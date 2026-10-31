import type { Order, Wallet } from '@/contracts/checkout'
import type { Nft } from '@/contracts/nft'

import { createSeedNfts, createSeedUsers, createSeedWallets } from './seed'

// O "banco de dados" do backend falso: um objeto em memória, espelhado no
// localStorage para sobreviver ao F5 (o desafio exige persistência).

const STORAGE_KEY = 'kurio:mock-db'
// Mude este número ao alterar o formato do banco: dados antigos salvos
// no navegador são descartados em vez de quebrar o app.
const SCHEMA_VERSION = 10 // 2: + newsletter · 3: NFTs ganharam rarity · 4: raridade ponderada no seed · 5: nota 4,8 do Emerald Ape · 6: usuários, sessões e favoritos · 7: carrinhos · 8: carteiras, pedidos e cenários · 9: cenários de rede · 10: perfil

export interface DbUser {
  id: string
  name: string
  email: string // sempre em minúsculas
  passwordSalt: string
  passwordHash: string // sha256(salt + ":" + senha). A senha em si nunca é guardada.
  avatarUrl: string | null
  username: string
  ensName: string
  walletNickname: string
}

export interface DbSession {
  token: string
  userId: string
  expiresAt: string // ISO
}

export interface DbCartItem {
  id: string
  nftId: string
  editionId: string
  quantity: number
  priceAtAdd: string // preço quando entrou no carrinho (para avisar se mudar)
}

export interface DbCart {
  id: string
  version: number
  items: DbCartItem[]
  couponCode: string | null
}

export interface DbOrder extends Order {
  userId: string
  quoteId: string
  settleAt: string // quando a "rede" decide (pendente até lá)
  outcome: 'confirmed' | 'declined' // decidido na criação, pelo cenário ativo
}

// Cenários: como o mock se comporta. O painel de cenários (e os testes) mudam isto.
export interface DbScenarios {
  // Rede (vale para toda a API, menos as rotas __dev):
  latency: 'normal' | 'slow' | 'variable' // normal 100–400ms · lenta 2,5s · variável 0,1–3s (fora de ordem)
  failure: 'none' | 'offline' | 'server-error' | 'unavailable' | 'timeout'
  walletConnect: 'approve' | 'decline'
  payment: 'confirm' | 'decline'
  orderTimeout: boolean // cria o pedido, mas demora mais que o timeout do cliente para responder
}

export const DEFAULT_SCENARIOS: DbScenarios = {
  latency: 'normal',
  failure: 'none',
  walletConnect: 'approve',
  payment: 'confirm',
  orderTimeout: false,
}

export interface DbState {
  schemaVersion: number
  nfts: Nft[]
  newsletter: string[] // e-mails inscritos, já em minúsculas
  users: DbUser[]
  sessions: DbSession[]
  favorites: Record<string, string[]> // userId → ids de NFTs
  // "user:<id>" para quem está logado, "guest:<id>" para visitantes
  carts: Record<string, DbCart>
  wallets: Record<string, Wallet[]> // userId → carteiras
  orders: DbOrder[]
  // "userId:chave" → qual pedido aquela Idempotency-Key criou, e com que conteúdo
  idempotency: Record<string, { bodyHash: string; orderId: string }>
  scenarios: DbScenarios
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
    carts: {},
    wallets: createSeedWallets(),
    orders: [],
    idempotency: {},
    scenarios: { ...DEFAULT_SCENARIOS },
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
