# Lighthouse: resultados

Gerado por `npm run lighthouse` em 2026-10-31T23:06:45.779Z. Mediana de 3 execuções por página e perfil.
Metas do README: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

## Medianas

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | Mobile | 70 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.60 s | 0.000 | 521 ms |
| Início | Desktop | 97 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 1.23 s | 0.002 | 2 ms |
| Detalhe do NFT | Mobile | 68 ❌ | 100 ✅ | 100 ✅ | 100 ✅ | 4.48 s | 0.000 | 623 ms |
| Detalhe do NFT | Desktop | 98 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 1.10 s | 0.000 | 5 ms |

## Todas as execuções

| Página | Perfil | Execução | Perf | A11y | BP | SEO | LCP | CLS | TBT | benchmarkIndex |
|---|---|---|---|---|---|---|---|---|---|---|
| Início | Mobile | 1 | 72 | 100 | 100 | 100 | 4.57 s | 0.000 | 456 ms | 1678 |
| Início | Mobile | 2 | 69 | 100 | 100 | 100 | 4.67 s | 0.000 | 564 ms | 1652 |
| Início | Mobile | 3 (relatório) | 70 | 100 | 100 | 100 | 4.60 s | 0.000 | 521 ms | 1677 |
| Início | Desktop | 1 | 97 | 100 | 100 | 100 | 1.23 s | 0.002 | 2 ms | 1602 |
| Início | Desktop | 2 (relatório) | 97 | 100 | 100 | 100 | 1.22 s | 0.002 | 2 ms | 1594 |
| Início | Desktop | 3 | 97 | 100 | 100 | 100 | 1.26 s | 0.002 | 2 ms | 1605 |
| Detalhe do NFT | Mobile | 1 | 68 | 100 | 100 | 100 | 4.65 s | 0.000 | 623 ms | 1639 |
| Detalhe do NFT | Mobile | 2 | 69 | 100 | 100 | 100 | 4.46 s | 0.000 | 607 ms | 1640 |
| Detalhe do NFT | Mobile | 3 (relatório) | 68 | 100 | 100 | 100 | 4.48 s | 0.000 | 664 ms | 1624 |
| Detalhe do NFT | Desktop | 1 (relatório) | 98 | 100 | 100 | 100 | 1.10 s | 0.000 | 3 ms | 1577 |
| Detalhe do NFT | Desktop | 2 | 97 | 100 | 100 | 100 | 1.23 s | 0.000 | 6 ms | 1626 |
| Detalhe do NFT | Desktop | 3 | 98 | 100 | 100 | 100 | 1.09 s | 0.000 | 5 ms | 1656 |

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
