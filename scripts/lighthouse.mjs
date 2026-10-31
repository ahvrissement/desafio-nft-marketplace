// Auditoria Lighthouse: `npm run lighthouse` (faz o build antes).
//
// Para cada página × perfil, roda RUNS vezes, cada uma num Chrome NOVO (perfil
// limpo: o mock começa do cenário padrão, sem herdar o localStorage da anterior).
// Depois calcula a mediana de cada categoria e de LCP/CLS/TBT e escreve:
//   lighthouse/RESULTADOS.md     tabela final + ambiente + condições
//   lighthouse/reports/          HTML e JSON da execução mediana (versionados)
//   lighthouse/runs/             todas as execuções (ignorada pelo git)
import { mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'

import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { preview } from 'vite'

import { COOLDOWN_MS, MIN_BENCHMARK_INDEX, PAGES, PORT, PROFILES, RUNS, TARGETS } from '../lighthouse/config.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'lighthouse')
const CATEGORIES = Object.keys(TARGETS)
const METRICS = [
  { id: 'largest-contentful-paint', label: 'LCP', format: (v) => `${(v / 1000).toFixed(2)} s` },
  { id: 'cumulative-layout-shift', label: 'CLS', format: (v) => v.toFixed(3) },
  { id: 'total-blocking-time', label: 'TBT', format: (v) => `${Math.round(v)} ms` },
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}
const score = (lhr, id) => Math.round(lhr.categories[id].score * 100)
const metric = (lhr, id) => lhr.audits[id].numericValue

// O Chromium que o Playwright já baixou: ninguém precisa ter o Chrome instalado.
// CHROME_PATH permite usar outro navegador, se quiser.
const chromePath = process.env.CHROME_PATH ?? chromium.executablePath()

await rm(path.join(OUT, 'runs'), { recursive: true, force: true })
await rm(path.join(OUT, 'reports'), { recursive: true, force: true })
await mkdir(path.join(OUT, 'runs'), { recursive: true })
await mkdir(path.join(OUT, 'reports'), { recursive: true })

// O build de produção servido pelo Vite, aqui dentro do processo (fecha junto).
const server = await preview({ root: ROOT, preview: { port: PORT, strictPort: true }, logLevel: 'warn' })
const baseUrl = `http://localhost:${PORT}`

// Se o Chrome cair no meio (falta de memória, por exemplo), o Lighthouse às
// vezes rejeita uma Promise "solta", fora do await. Sem isto, o Node encerraria
// a auditoria inteira; com isto, a tentativa falha e é repetida.
process.on('unhandledRejection', (error) => console.warn(`  aviso: ${error?.message ?? error}`))

const MAX_ATTEMPTS = 3

// Uma execução. Devolve null se o Chrome caiu.
async function audit(url, config) {
  const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new'] })
  try {
    return await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, config)
  } catch (error) {
    console.warn(`  o Chrome falhou (${error.message})`)
    return null
  } finally {
    await chrome.kill()
  }
}

const results = []
const discarded = [] // tudo que foi descartado aparece no RESULTADOS.md
try {
  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const runs = []
      for (let run = 1; run <= RUNS; run++) {
        // A execução é descartada e repetida se o Chrome cair ou se a CPU
        // estava degradada (benchmarkIndex baixo). O benchmarkIndex mede a
        // MÁQUINA antes da página carregar: não depende do site.
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          await setTimeout(COOLDOWN_MS)
          const label = `${page.name} · ${profile.name} · execução ${run}`
          const result = await audit(baseUrl + page.path, profile.config)
          if (!result) {
            discarded.push({ label, attempt, reason: 'o Chrome fechou no meio da execução' })
            continue
          }
          const { lhr, report } = result
          const benchmark = Math.round(lhr.environment.benchmarkIndex)
          const degraded = benchmark < MIN_BENCHMARK_INDEX
          console.log(`${label}: performance ${score(lhr, 'performance')} (benchmarkIndex ${benchmark})${degraded ? ' ⚠️ CPU degradada' : ''}`)
          if (degraded && attempt < MAX_ATTEMPTS) {
            discarded.push({ label, attempt, reason: `CPU degradada (benchmarkIndex ${benchmark}, performance ${score(lhr, 'performance')})` })
            continue
          }
          // Na última tentativa, fica mesmo degradada (marcada com ⚠️ na tabela).
          const name = `${page.id}-${profile.id}-${run}`
          await writeFile(path.join(OUT, 'runs', `${name}.html`), report[0])
          await writeFile(path.join(OUT, 'runs', `${name}.json`), report[1])
          runs.push({ run, lhr, report })
          break
        }
      }
      if (runs.length === 0) throw new Error(`Nenhuma execução válida para ${page.name} · ${profile.name}`)

      // Execução "representativa": a de performance mediana. É o relatório entregue.
      const byPerformance = [...runs].sort((a, b) => score(a.lhr, 'performance') - score(b.lhr, 'performance'))
      const representative = byPerformance[Math.floor(byPerformance.length / 2)]
      const name = `${page.id}-${profile.id}`
      await writeFile(path.join(OUT, 'reports', `${name}.html`), representative.report[0])
      await writeFile(path.join(OUT, 'reports', `${name}.json`), representative.report[1])

      results.push({
        page,
        profile,
        runs,
        representative: representative.run,
        medians: {
          ...Object.fromEntries(CATEGORIES.map((id) => [id, median(runs.map((r) => score(r.lhr, id)))])),
          ...Object.fromEntries(METRICS.map((m) => [m.id, median(runs.map((r) => metric(r.lhr, m.id)))])),
        },
      })
    }
  }
} finally {
  await server.close()
}

await writeFile(path.join(OUT, 'RESULTADOS.md'), renderMarkdown(results))
console.log(`\nResumo em lighthouse/RESULTADOS.md; relatórios em lighthouse/reports/`)

function renderMarkdown(results) {
  const check = (id, value) => (value >= TARGETS[id] ? `${value} ✅` : `${value} ❌`)
  const first = results[0].runs[0].lhr
  const lines = [
    '# Lighthouse: resultados',
    '',
    `Gerado por \`npm run lighthouse\` em ${new Date().toISOString()}. Mediana de ${RUNS} execuções por página e perfil.`,
    `Metas do README: Performance ≥ ${TARGETS.performance}, Accessibility ≥ ${TARGETS.accessibility}, Best Practices ≥ ${TARGETS['best-practices']}, SEO ≥ ${TARGETS.seo}.`,
    '',
    '## Medianas',
    '',
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
    '|---|---|---|---|---|---|---|---|---|',
    ...results.map(
      (r) =>
        `| ${r.page.name} | ${r.profile.name} | ${CATEGORIES.map((id) => check(id, r.medians[id])).join(' | ')} | ${METRICS.map((m) => m.format(r.medians[m.id])).join(' | ')} |`,
    ),
    '',
    '## Todas as execuções',
    '',
    '| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | benchmarkIndex |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...results.flatMap((r) =>
      r.runs.map(
        ({ run, lhr }) =>
          `| ${r.page.name} | ${r.profile.name} | ${run}${run === r.representative ? ' (relatório)' : ''} | ${CATEGORIES.map((id) => score(lhr, id)).join(' | ')} | ${METRICS.map((m) => m.format(metric(lhr, m.id))).join(' | ')} | ${Math.round(lhr.environment.benchmarkIndex)}${lhr.environment.benchmarkIndex < MIN_BENCHMARK_INDEX ? ' ⚠️' : ''} |`,
      ),
    ),
    '',
    `\`benchmarkIndex\`: velocidade da CPU medida pelo próprio Lighthouse em cada execução. ⚠️ = abaixo de ${MIN_BENCHMARK_INDEX}: a máquina estava ocupada e a execução não representa o site.`,
    '',
    '## Execuções descartadas e repetidas',
    '',
    ...(discarded.length === 0
      ? ['Nenhuma.']
      : [
          `Uma execução é repetida (até ${MAX_ATTEMPTS} tentativas) se o Chrome cair ou se a CPU estiver degradada (benchmarkIndex < ${MIN_BENCHMARK_INDEX}).`,
          '',
          ...discarded.map((d) => `- ${d.label}, tentativa ${d.attempt}: ${d.reason}`),
        ]),
    '',
    '## Ambiente e ferramentas',
    '',
    `- Lighthouse ${first.lighthouseVersion}`,
    `- Navegador: ${first.environment.hostUserAgent}`,
    `- Node ${process.version}, ${os.type()} ${os.release()} (${os.arch()})`,
    `- CPU: ${os.cpus()[0]?.model.trim()} (${os.cpus().length} threads), ${Math.round(os.totalmem() / 1024 ** 3)} GB de RAM`,
    `- Servidor: \`vite preview\` (build de produção) em ${baseUrl}, mocks (MSW) ligados no cenário padrão`,
    `- Um Chrome novo (perfil limpo) por execução, com ${COOLDOWN_MS / 1000} s de pausa antes de cada uma`,
    '',
    '## Condições de cada perfil',
    '',
    ...results
      .filter((r, index, all) => all.findIndex((x) => x.profile.id === r.profile.id) === index)
      .flatMap((r) => {
        const s = r.runs[0].lhr.configSettings
        const t = s.throttling
        return [
          `- **${r.profile.name}:** tela ${s.screenEmulation.width}×${s.screenEmulation.height} (DPR ${s.screenEmulation.deviceScaleFactor}), ` +
            `throttling \`${s.throttlingMethod}\`: RTT ${t.rttMs} ms, ${(t.throughputKbps / 1024).toFixed(1)} Mbps, CPU ${t.cpuSlowdownMultiplier}× mais lenta`,
        ]
      }),
    '',
    'Configuração: `lighthouse/config.mjs`. Relatórios da execução mediana: `lighthouse/reports/`.',
    '',
  ]
  return lines.join('\n')
}
