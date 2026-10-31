// Configuração VERSIONADA da auditoria Lighthouse (README, seção 10).
// Quem roda `npm run lighthouse` mede sempre a mesma coisa, do mesmo jeito.
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

// README: "audite início e detalhe do NFT".
export const PAGES = [
  { id: 'inicio', name: 'Início', path: '/' },
  { id: 'detalhe', name: 'Detalhe do NFT', path: '/nft/emerald-ape-042' },
]

// README: "três medições por página e perfil e reporte a mediana".
// LH_RUNS / LH_PROFILE / LH_COOLDOWN_MS: atalhos para medir rápido durante o
// desenvolvimento. A auditoria entregue usa os valores padrão.
export const RUNS = Number(process.env.LH_RUNS ?? 3)

// README: metas por categoria.
export const TARGETS = {
  performance: 90,
  accessibility: 95,
  'best-practices': 95,
  seo: 90,
}

const onlyCategories = Object.keys(TARGETS)

// Os perfis OFICIAIS do Lighthouse, sem ajuste nenhum (só limitamos às 4 categorias):
//   mobile: celular médio emulado (412×823), 4G lento simulado, CPU 4× mais lenta.
//   desktop: 1350×940, rede rápida, CPU sem redução.
// As condições exatas de cada execução saem no relatório (configSettings).
const ALL_PROFILES = [
  {
    id: 'mobile',
    name: 'Mobile',
    config: { extends: 'lighthouse:default', settings: { onlyCategories } },
  },
  {
    id: 'desktop',
    name: 'Desktop',
    config: { ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories } },
  },
]

export const PROFILES = process.env.LH_PROFILE ? ALL_PROFILES.filter((p) => p.id === process.env.LH_PROFILE) : ALL_PROFILES

export const PORT = 4173

// Pausa antes de cada execução. Em notebooks (CPU de baixo consumo), a carga
// contínua faz a CPU reduzir a frequência, e as medições seguintes ficam bem
// mais lentas que a primeira (o benchmarkIndex do relatório mostra isso).
// Esperar a CPU "esfriar" deixa as execuções comparáveis entre si.
export const COOLDOWN_MS = Number(process.env.LH_COOLDOWN_MS ?? 30_000)

// Abaixo disto, a execução rodou com a CPU degradada (pouca RAM livre, bateria,
// outros programas) e é marcada com ⚠️ no resultado. Nesta máquina, com ela
// livre, o benchmarkIndex fica perto de 1000.
export const MIN_BENCHMARK_INDEX = 600
