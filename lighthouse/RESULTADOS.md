# Lighthouse: resultados

Gerado por `npm run lighthouse` em 2026-10-31T23:59:46.718Z. Mediana de 3 execuções por página e perfil.
Metas do README: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Medianas

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | Mobile | 77 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.13 s | 0.001 | 376 ms |
| Início | Desktop | 99 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 0.96 s | 0.002 | 0 ms |
| Detalhe do NFT | Mobile | 67 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.61 s | 0.000 | 632 ms |
| Detalhe do NFT | Desktop | 99 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 1.04 s | 0.000 | 0 ms |

## Todas as execuções

| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | benchmarkIndex |
|---|---|---|---|---|---|---|---|---|---|---|
| Início | Mobile | 1 | 76 | 100 | 100 | 100 | 4.13 s | 0.001 | 403 ms | 1676 |
| Início | Mobile | 2 (relatório) | 77 | 100 | 100 | 100 | 4.23 s | 0.001 | 376 ms | 1679 |
| Início | Mobile | 3 | 78 | 100 | 100 | 100 | 4.07 s | 0.001 | 359 ms | 1627 |
| Início | Desktop | 1 | 99 | 100 | 100 | 100 | 0.96 s | 0.002 | 0 ms | 1603 |
| Início | Desktop | 2 (relatório) | 99 | 100 | 100 | 100 | 0.96 s | 0.002 | 0 ms | 1614 |
| Início | Desktop | 3 | 99 | 100 | 100 | 100 | 0.97 s | 0.002 | 0 ms | 1615 |
| Detalhe do NFT | Mobile | 1 | 71 | 100 | 100 | 100 | 4.50 s | 0.000 | 529 ms | 1451 |
| Detalhe do NFT | Mobile | 2 | 63 | 100 | 100 | 100 | 4.77 s | 0.000 | 798 ms | 1570 |
| Detalhe do NFT | Mobile | 3 (relatório) | 67 | 100 | 100 | 100 | 4.61 s | 0.000 | 632 ms | 1537 |
| Detalhe do NFT | Desktop | 1 | 99 | 100 | 100 | 100 | 1.04 s | 0.000 | 0 ms | 1555 |
| Detalhe do NFT | Desktop | 2 (relatório) | 99 | 100 | 100 | 100 | 1.04 s | 0.000 | 0 ms | 1488 |
| Detalhe do NFT | Desktop | 3 | 99 | 100 | 100 | 100 | 1.04 s | 0.000 | 0 ms | 1618 |

`benchmarkIndex`: velocidade da CPU medida pelo próprio Lighthouse em cada execução. ⚠️ = abaixo de 600: a máquina estava ocupada e a execução não representa o site.

## Execuções descartadas e repetidas

Nenhuma.

## Ambiente e ferramentas

- Lighthouse 13.6.0
- Navegador: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- Node v26.13.0, Windows_NT 10.0.26200 (x64)
- CPU: Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz (8 threads), 8 GB de RAM
- Servidor: `vite preview` (build de produção) em http://localhost:4173, mocks (MSW) ligados no cenário padrão
- Um Chrome novo (perfil limpo) por execução, com 30 s de pausa antes de cada uma

## Condições de cada perfil

- **Mobile:** tela 412×823 (DPR 1.75), throttling `simulate`: RTT 150 ms, 1.6 Mbps, CPU 4× mais lenta
- **Desktop:** tela 1350×940 (DPR 1), throttling `simulate`: RTT 40 ms, 10.0 Mbps, CPU 1× mais lenta

Configuração: `lighthouse/config.mjs`. Relatórios da execução mediana: `lighthouse/reports/`.
