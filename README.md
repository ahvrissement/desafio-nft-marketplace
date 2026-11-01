# Kurio: marketplace de NFTs

Solução do desafio de frontend da Jungle Gaming: descoberta, compra e conta do colecionador, em desktop e mobile, sobre uma API simulada no navegador (MSW) com eventos em tempo real (Socket.IO).

- **Aplicação publicada:** https://desafio-nft-marketplace-navy.vercel.app (Vercel, com os mocks e o tempo real ligados)
- **Arquitetura, contratos e decisões:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Auditoria Lighthouse:** [lighthouse/RESULTADOS.md](lighthouse/RESULTADOS.md)

**Stack:** React 19, TypeScript, TanStack Router, TanStack Query, Axios, Tailwind CSS 4, shadcn/ui (Radix), MSW 2 com `@mswjs/socket.io-binding`, Socket.IO client, Zod, React Hook Form, Playwright, Vitest e Lighthouse, sobre Vite 8.

---

## Setup

Requisitos: **Node.js 22.19 ou mais novo** e npm. Não há backend, serviço privado nem chave de API: tudo roda a partir de um checkout limpo.

```bash
npm ci                              # instala exatamente as versões do package-lock.json
npx playwright install chromium     # navegador dos testes E2E e da auditoria Lighthouse
npm run dev                         # http://localhost:5173, com os mocks ligados
```

## Variáveis de ambiente

Nenhuma é obrigatória. O padrão (mocks ligados) é o mesmo do deploy. Veja [.env.example](.env.example).

| Variável | Padrão | Efeito |
|---|---|---|
| `VITE_ENABLE_MOCKS` | ligado | `false` desliga o MSW e o Socket.IO simulado; o app passa a chamar uma API real em `/api`, que este repositório não inclui. |

## Credenciais fictícias

| Usuário | E-mail | Senha | O que já tem no seed |
|---|---|---|---|
| Ana Kurio | `ana@kurio.dev` | `Kurio@123` | 2 favoritos, carteiras principal e secundária |
| Pedro Brito | `pedro@kurio.dev` | `Kurio@123` | carteiras próprias, sem favoritos |

Também dá para criar uma conta nova pelo cadastro. As senhas nunca são guardadas em texto puro: o mock salva `sha256(salt + senha)` com um salt por usuário.

**Cupons:** `KURIO10` (10%) e `GENESIS5` (5%) são válidos; `BOASVINDAS` está vencido. Qualquer outro código é inválido.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com mocks (Vite + MSW) |
| `npm run build` | Verificação de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção (http://localhost:4173) |
| `npm run typecheck` | Verificação de tipos (`tsc -b`) |
| `npm run lint` | Lint (oxlint) |
| `npm test` | Testes unitários (Vitest): handlers do mock, contas com dinheiro, URL do catálogo e paginação |
| `npm run test:e2e` | Testes E2E e de regressão visual (Playwright), contra o build de produção |
| `npm run test:e2e:report` | Abre o relatório HTML da última execução |
| `npm run test:e2e:update` | Regera as baselines visuais |
| `npm run lighthouse` | Auditoria Lighthouse: build, 3 execuções por página e perfil, medianas e relatórios |

### Testes E2E (Playwright)

- Rodam contra `npm run build && vite preview` (o `webServer` do Playwright sobe o servidor sozinho), no Chromium, em dois projetos: **desktop** (1440×900) e **mobile** (390×844, testes marcados com `@mobile`). Há verificações extras de layout em **768 e 320 px** (`e2e/responsive.spec.ts`).
- **Contra o deploy:** `E2E_BASE_URL` troca o endereço e dispensa o servidor local. Exemplo: `E2E_BASE_URL=https://desafio-nft-marketplace-navy.vercel.app npx playwright test --grep-invert "regressão visual"`. Os testes visuais ficam de fora porque as baselines são da máquina local. Os 64 testes funcionais passam no ambiente publicado.
- Os 12 fluxos do README estão em `e2e/01-catalog.spec.ts` … `e2e/12-loading-errors.spec.ts`, com regressão visual em `e2e/visual.spec.ts`.
- Cada teste começa de um estado isolado: um contexto de navegador novo e `localStorage` vazio, logo o mock começa do seed.
- Relógio, latência e eventos são controlados pelo teste: `page.clock` e as rotas `/api/__dev/*` do próprio mock.
- **Relatório HTML:** `playwright-report/index.html` (`npm run test:e2e:report`). **Traces das falhas:** `test-results/<teste>/trace.zip` (`trace: 'retain-on-failure'`), abrir com `npx playwright show-trace <arquivo>`.
- As baselines visuais (`e2e/visual.spec.ts-snapshots/`) foram geradas no **Windows**. Em outro sistema operacional, o Playwright procura baselines com outro sufixo; gere as suas uma vez com `npm run test:e2e:update`.

### Auditoria Lighthouse

`npm run lighthouse` faz o build e sobe o preview dentro do próprio script. Em seguida, audita **Início** e **Detalhe do NFT** nos perfis oficiais **mobile** e **desktop**, 3 vezes cada, sempre num Chrome novo, com o mock no cenário padrão. Ao final, escreve:

- `lighthouse/RESULTADOS.md`: medianas, todas as execuções, versões, ambiente e condições;
- `lighthouse/reports/`: HTML e JSON da execução mediana de cada combinação (versionados);
- `lighthouse/runs/`: todas as execuções (fora do git).

A configuração versionada fica em [lighthouse/config.mjs](lighthouse/config.mjs). Execuções com a CPU degradada (`benchmarkIndex` < 600) são repetidas e listadas no resultado. Resultados e justificativas: [ARCHITECTURE.md § Performance](ARCHITECTURE.md#performance-e-lighthouse).

---

## Cenários do mock: seleção e reset

O backend simulado tem cenários configuráveis e reproduzíveis. Eles ficam salvos (no `localStorage`) até o reset.

**Pelo painel:** o botão **Cenários** fica no canto inferior esquerdo (no celular, é o ícone de frasco acima da barra inferior). Ele está disponível também no deploy.

| Grupo | Opções |
|---|---|
| Latência | Normal (0,1–0,4 s) · Lenta (2,5 s) · Variável (0,1–3 s, respostas fora de ordem) |
| Falha de rede/HTTP | Nenhuma · Sem conexão · Erro 500 · Erro 503 · Timeout (12 s) |
| Carteira | Aprova a conexão · Recusa a conexão |
| Pagamento | Confirmado · Recusado |
| Pedido | Timeout depois de criar o pedido |
| Catálogo (dispara `nft.updated`) | Subir 10% o preço do 1º item do carrinho · Esgotar o 1º item do carrinho |
| Sessão e tempo real | Expirar a sessão agora · Reenviar o último evento (duplicata) · Enviar evento com versão antiga · Derrubar a conexão Socket.IO |

**Reset completo:** o botão vermelho **Reset completo (cenário padrão)** no fim do painel. Ele volta o banco ao seed, limpa sessões, carrinhos, pedidos e cenários, e volta para a Home.

**Pela API** (o que os testes usam), no console do navegador com o app aberto:

```js
await fetch('/api/__dev/scenarios', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latency: 'slow' }) })
await fetch('/api/__dev/reset', { method: 'POST' })
```

As rotas `__dev` são `GET|PUT /api/__dev/scenarios`, `POST /api/__dev/reset`, `POST /api/__dev/expire-sessions`, `POST /api/__dev/nft-update` e `POST /api/__dev/realtime`. Elas ignoram os cenários de latência e falha.

## Como reproduzir os fluxos de falha

Comece de um reset. Entre como `ana@kurio.dev` / `Kurio@123` quando o fluxo pedir login.

| Fluxo | Como reproduzir | O que se espera |
|---|---|---|
| Carregamento lento (skeletons) | Latência **Lenta** e abra a Home ou um NFT | Skeletons com shimmer do mesmo tamanho do conteúdo, sem saltos de layout |
| Respostas fora de ordem | Latência **Variável** e troque filtros rápido | A tela mostra sempre o resultado do **último** filtro escolhido |
| Falha e nova tentativa | Falha **Erro 500** (ou Sem conexão), abra a Home; depois **Nenhuma** e clique em "Tentar de novo" | Mensagem de erro com "Tentar de novo", que recupera os dados |
| Favoritar com falha (rollback) | Entre, abra um NFT, falha **Erro 500**, clique em Favoritar | O coração volta ao estado anterior e aparece um aviso |
| Resultado vazio | Busque por `zzz` no catálogo | Estado vazio com "Limpar filtros" |
| NFT inexistente | Abra `/nft/nao-existe` | Página "NFT não encontrado" |
| Cadastro com conflito | Cadastre-se com `ana@kurio.dev` | Erro no campo de e-mail, vindo da API, com o foco nele |
| Login inválido | Entre com a senha `errada123` | "E-mail ou senha incorretos." |
| Sessão expirada (navegando) | Entre, clique em **Expirar a sessão agora** e favorite algo | Aviso "Sua sessão expirou", dados privados limpos e "Entrar" reabre o login na mesma página |
| Sessão expirada (no pagamento) | No `/checkout`, preencha campos, **Expirar a sessão agora** e clique em "Conectar agora" | Tela "Sua sessão expirou"; depois do login, o formulário volta preenchido |
| Rota privada sem login | Abra `/checkout`, `/profile` ou `/favorites` deslogado | Login; depois dele, volta para a rota pedida |
| Cupom inválido / vencido | No carrinho, aplique `XYZ` ou `BOASVINDAS` | Erro no campo do cupom; o total não muda |
| Estoque insuficiente | No detalhe, escolha a edição 1/10 e tente passar do estoque | O "+" para no limite e a mensagem explica por quê |
| Preço muda durante a compra | Com item no carrinho, abra `/checkout` e clique em **Subir 10% o preço…** | Aviso em tempo real, resumo atualizado e "Pagar" bloqueado até nova confirmação |
| Edição esgota durante a compra | Mesmo fluxo, com **Esgotar o 1º item do carrinho** | Item marcado como esgotado e compra bloqueada |
| Carteira recusa a conexão | Carteira **Recusa a conexão** e clique em "Conectar agora" no checkout | Erro de conexão; dá para tentar de novo |
| Pagamento recusado | Pagamento **Recusado** e finalize a compra | Pedido recusado (estado final), itens continuam no carrinho |
| Timeout depois de criar o pedido | Marque **Timeout depois de criar o pedido** e finalize | O app reenvia com a mesma `Idempotency-Key` e recupera o **mesmo** pedido, sem duplicar |
| Clique repetido em "Pagar" | Clique várias vezes seguidas | Um único pedido |
| Queda do Socket.IO com pedido pendente | Finalize a compra e, enquanto estiver pendente, **Derrubar a conexão Socket.IO** (ou dê F5) | Ao reconectar ou recarregar, o pedido é reconciliado pela REST e chega ao estado final |
| Evento duplicado / antigo | Depois de um `nft.updated`, use **Reenviar o último evento** e **Enviar evento com versão antiga** | Nada muda: o cliente ignora duplicatas e versões antigas |

---

## Estrutura

```
src/
  contracts/   schemas Zod compartilhados por mock, cliente e UI (tipos de ponta a ponta)
  mocks/       MSW: banco simulado, seed, handlers REST, Socket.IO, cenários
  features/    uma pasta por domínio (catalog, nft-detail, auth, cart, checkout, orders, profile, ...)
  routes/      rotas do TanStack Router (baseadas em arquivos)
  components/  layout e componentes compartilhados (ui/ = shadcn)
  lib/         http (Axios), dinheiro em BigInt, query client, utilitários
e2e/           testes Playwright
lighthouse/    configuração, resultados e relatórios da auditoria
```
