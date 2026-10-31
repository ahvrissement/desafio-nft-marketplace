# Lighthouse: resultados

Gerado por `npm run lighthouse` em 2026-10-31T23:29:05.720Z. Mediana de 1 execuções por página e perfil.
Metas do README: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Medianas

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | Mobile | 78 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.13 s | 0.000 | 359 ms |
| Detalhe do NFT | Mobile | 72 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.42 s | 0.000 | 493 ms |

## Todas as execuções

| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | benchmarkIndex |
|---|---|---|---|---|---|---|---|---|---|---|
| Início | Mobile | 1 (relatório) | 78 | 100 | 100 | 100 | 4.13 s | 0.000 | 359 ms | 1518 |
| Detalhe do NFT | Mobile | 1 (relatório) | 72 | 100 | 100 | 100 | 4.42 s | 0.000 | 493 ms | 1604 |

`benchmarkIndex`: velocidade da CPU medida pelo próprio Lighthouse em cada execução. ⚠️ = abaixo de 600: a máquina estava ocupada e a execução não representa o site.

## Execuções descartadas e repetidas

Nenhuma.

## Ambiente e ferramentas

- Lighthouse 13.6.0
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- Node v26.13.0, Windows_NT 10.0.26200 (x64)
- CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 threads), 8 GB de RAM
- Servidor: `vite preview` (build de produção) em http://localhost:4173, mocks (MSW) ligados no cenário padrão
- Um Chrome novo (perfil limpo) por execução, com 10 s de pausa antes de cada uma

## Condições de cada perfil

- **Mobile:** tela 412×823 (DPR 1.75), throttling `simulate`: RTT 150 ms, 1.6 Mbps, CPU 4× mais lenta

Configuração: `lighthouse/config.mjs`. Relatórios da execução mediana: `lighthouse/reports/`.
