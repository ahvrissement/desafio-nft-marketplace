# Arquitetura

Este documento descreve como o Kurio funciona por dentro:

- os contratos REST e de eventos;
- a política de sessão;
- o estado do carrinho;
- a estratégia de cache;
- a reconciliação entre REST e Socket.IO;
- as decisões de UX, as limitações e os desvios do Figma.

Para rodar o projeto, veja o [README](README.md).

## Visão geral

```
UI (React + shadcn/ui + Tailwind)
  │  rotas, search params e guardas  → TanStack Router
  │  dados remotos, cache, mutations → TanStack Query
  ▼
lib/http.ts (Axios)  ── toda chamada REST passa por aqui (token, erros, timeout)
  ▼
Service worker do MSW ── intercepta /api/*  →  src/mocks/handlers (REST)
socket.io-client     ── WebSocket interceptado →  src/mocks/realtime.ts (eventos)
                                │
                     src/mocks/db.ts (banco em memória, espelhado no localStorage)
```

- **Contratos tipados de ponta a ponta.** Os schemas Zod de `src/contracts/` são a fonte única dos contratos. O mock valida o que recebe e o que devolve com eles. O cliente valida toda resposta com eles (`request(schema, …)` em `lib/http.ts`), e a UI usa os tipos inferidos. Uma resposta fora do contrato vira `ApiError` com o código `INVALID_RESPONSE`.
- **Mocks só na camada de rede.** O MSW é reaproveitado no desenvolvimento, no deploy e nos testes. Componentes, hooks e o cliente Axios não têm respostas falsas nem caminhos alternativos: com `VITE_ENABLE_MOCKS=false`, o mesmo código chama `/api` de verdade.
- **Dinheiro sem `number`.** Valores em ETH trafegam como strings decimais (`"1.19"`, até 18 casas). As contas são feitas em wei com `BigInt` (`lib/money.ts`), e as quantidades são inteiras. O total que vale para fechar o pedido é sempre o da cotação da API.

## Contratos REST

Base: `/api`. Todos os corpos são JSON validados pelos schemas de `src/contracts/`. Rotas marcadas com 🔒 exigem `Authorization: Bearer <token>`.

### Sessão e conta (`contracts/auth.ts`)

| Método e rota | Descrição | Erros principais |
|---|---|---|
| `POST /auth/signup` | Cria a conta e já abre a sessão | 400/422 `VALIDATION_ERROR` · 409 `CONFLICT` (e-mail já cadastrado) |
| `POST /auth/login` | Abre a sessão (`{ token, user }`) | 401 `INVALID_CREDENTIALS` (mensagem única para e-mail ou senha errados) |
| `GET /auth/session` | Quem está logado, e renova a sessão | 401 `SESSION_EXPIRED` |
| `POST /auth/logout` | Encerra a sessão no servidor | 401 |

### NFTs (`contracts/nft.ts`)

| Método e rota | Descrição |
|---|---|
| `GET /nfts?q&category&network&minPrice&maxPrice&tab&sort&page` | Listagem paginada (9 por página). `category` e `network` se repetem (`?network=a&network=b`). `tab`: `all`, `new`, `trending`; `sort`: `recent`, `price-asc`, `price-desc`. Parâmetro inválido → 400. |
| `GET /nfts/facets` | Contagens por categoria e rede, e a faixa de preço |
| `GET /nfts/featured` | NFT em destaque |
| `GET /nfts/:id` | Detalhe com edições (preço e estoque por edição) e `version` · 404 `NOT_FOUND` |
| `GET /nfts/:id/reviews` · `GET /nfts/:id/related` | Avaliações e "Mais desta coleção" |

### Favoritos 🔒

`GET /me/favorites` (ids) · `GET /me/favorites/nfts` (os cards) · `PUT /me/favorites/:nftId` · `DELETE /me/favorites/:nftId`

### Carrinho (`contracts/cart.ts`)

Funciona com ou sem login. Visitante: header `X-Cart-Id` (id guardado no `localStorage`). Logado: o carrinho é do usuário.

| Método e rota | Descrição | Erros |
|---|---|---|
| `GET /cart` | Itens, cupom, resumo (subtotal, desconto, taxa de rede, total), `version` e avisos por item (`price_changed`, `insufficient_stock`, `sold_out`) | |
| `POST /cart/items` | Adiciona `{ nftId, editionId, quantity }` | 409 `CONFLICT` (esgotado, estoque ou limite de 10 por pedido) · 404 |
| `PATCH /cart/items/:itemId` · `DELETE /cart/items/:itemId` | Altera a quantidade · remove | 409 · 404 |
| `PUT /cart/coupon` · `DELETE /cart/coupon` | Aplica · remove o cupom | 422 (inválido ou vencido) |
| `POST /cart/merge` 🔒 | Junta o carrinho do visitante ao da conta, depois do login | |

### Cotação, carteiras e pedidos (`contracts/checkout.ts`) 🔒

| Método e rota | Descrição | Erros |
|---|---|---|
| `GET /checkout/quote` | Revalida preço, estoque, cupom e taxas. O `id` é uma impressão digital (FNV) de tudo isso: se algo mudar, o id muda. `blocked` indica itens que impedem a compra. | |
| `GET /me/wallets` · `POST /me/wallets` · `PATCH /me/wallets/:walletId` | Carteiras: no máximo uma principal e uma secundária | 409 (endereço duplicado) · 422 |
| `POST /wallet/connect` | Conexão simulada com a carteira | 403 `WALLET_DECLINED` |
| `POST /orders` + header `Idempotency-Key` | Cria o pedido a partir de `{ quoteId, buyer, wallet }` e responde `pending` | 409 `QUOTE_CHANGED` (a cotação mudou: confirmar de novo) · 409 `IDEMPOTENCY_CONFLICT` (mesma chave, conteúdo diferente) |
| `GET /orders/:orderId` | Status e recibo. O pedido de outra pessoa responde 404, e não 403, para não confirmar que ele existe. | 404 |

**Idempotência:** a chave é gerada por **tentativa de compra** e guardada no `sessionStorage`. A mesma chave com o mesmo conteúdo devolve o **mesmo** pedido. A mesma chave com outro conteúdo devolve 409. Timeouts e quedas de rede são repetidos automaticamente com a mesma chave. O botão "Pagar" trava de forma síncrona no primeiro clique, então cliques repetidos não geram outro pedido.

**Ciclo do pedido:** `pending` → `confirmed` | `declined` (estados finais). A "rede" decide em 2,5 s. A decisão também é aplicada quando o pedido é lido, o que torna o resultado recuperável depois de um F5. Ao confirmar, o estoque baixa e só os itens e quantidades comprados saem do carrinho. Ao recusar, nada muda no carrinho. O recibo é um **snapshot**: mudanças posteriores no catálogo não alteram seus valores. Hash e link do explorador são simulados.

### Perfil (`contracts/profile.ts`) 🔒

`GET /me/profile` · `PATCH /me/profile` (409 para e-mail ou usuário já em uso) · `PUT /me/avatar` (imagem redimensionada para 128 px no cliente, em webp) · `DELETE /me/avatar` · `POST /me/password` (400 `VALIDATION_ERROR` para senha atual incorreta ou senha nova igual à atual)

### Formato de erro e códigos

Todo erro tem o formato `{ error: { code, message, fieldErrors? } }`. `fieldErrors` vai direto para os campos do formulário.

| HTTP | Código | Quando |
|---|---|---|
| 400/422 | `VALIDATION_ERROR` | Dados inválidos (com `fieldErrors`) |
| 401 | `UNAUTHENTICATED` · `SESSION_EXPIRED` · `INVALID_CREDENTIALS` | Sem sessão · sessão vencida · login errado |
| 403 | `FORBIDDEN` · `WALLET_DECLINED` | Sem permissão · carteira recusou |
| 404 | `NOT_FOUND` | Recurso inexistente |
| 409 | `CONFLICT` · `QUOTE_CHANGED` · `IDEMPOTENCY_CONFLICT` | Estoque/duplicidade · cotação desatualizada · chave reaproveitada |
| 500/503 | `INTERNAL_ERROR` · `SERVICE_UNAVAILABLE` | Falhas transitórias (repetidas automaticamente) |

O cliente acrescenta `NETWORK_ERROR`, `TIMEOUT` (10 s) e `INVALID_RESPONSE`. Só as falhas transitórias são repetidas (`ApiError.isRetryable`): rede, timeout, 5xx, 408 e 429.

## Eventos em tempo real (Socket.IO)

- **Conexão:** `socket.io-client` → `wss://realtime.kurio.test`, só com o transporte WebSocket. O token vai na query da URL. Sem token, o cliente recebe só os eventos públicos.
- **Envelope** (`contracts/realtime.ts`): `{ eventId, type, resourceId, version, occurredAt, data }`. Todo evento é validado com Zod antes de ser aplicado.

| Evento | Quem recebe | Efeito no cliente |
|---|---|---|
| `nft.updated` | Todos | O detalhe aberto é atualizado direto no cache (preço, estoque por edição, `version`). Listas, destaque e relacionados são invalidados. Se o NFT está no carrinho, o carrinho e a cotação são invalidados, um aviso acessível (toast, `aria-live`) explica a mudança e o "Pagar" fica bloqueado até nova confirmação. |
| `order.updated` | Só o dono do pedido | Atualiza o status do pedido no cache. A tela muda para confirmado ou recusado. |

- **Origem dos eventos:** toda mudança no banco do mock (compra, rota `__dev/nft-update`, painel de cenários) altera a resposta REST **e** emite o evento correspondente pelo binding `@mswjs/socket.io-binding`. Os testes passam pelo `socket.io-client` de verdade. Nenhum evento é simulado direto na UI.

## Reconciliação REST × Socket.IO

1. **Duplicatas:** os `eventId` já aplicados na sessão são ignorados (até 500 guardados).
2. **Eventos antigos:** um evento só é aplicado se a `version` dele for maior que a maior conhecida, seja do cache ou de eventos anteriores. O estado nunca regride, por exemplo um "pendente" atrasado depois de um "confirmado".
3. **Reconexão:** ao reconectar, o cliente pode ter perdido eventos. Por isso ele invalida tudo o que está em uso (`['nfts']`, `['me', userId]` ou o carrinho do visitante) e a REST volta a ser a fonte da verdade.
4. **Pedido pendente:** enquanto o pedido está `pending`, a tela também consulta a REST (`refetchInterval`), como rede de segurança caso um evento se perca. Depois de um F5, o pedido é lido de novo e chega ao estado final sem criar outra compra.
5. **Troca de usuário:** existe um socket por sessão. No logout ou na troca de conta, ele é desconectado e os listeners são removidos. O `userId` usado ao aplicar `order.updated` é o da sessão que abriu o socket, então um evento atrasado nunca escreve no cache de outra pessoa.

## Política de sessão

- **Token opaco** devolvido pelo login ou cadastro, guardado no `localStorage` (`kurio:session-token`) e enviado em todo request pelo interceptor do Axios.
- **Expiração deslizante de 30 minutos:** cada request autenticado empurra o vencimento. A sessão sobrevive ao F5: `GET /auth/session` restaura o usuário.
- **Expiração no meio do uso:** qualquer resposta `SESSION_EXPIRED` a um request que levou token dispara um tratador único (`setSessionExpiredHandler`). Ele limpa os dados privados (`['me', …]`) e mostra um aviso com "Entrar" que reabre o login **na mesma página**. No pagamento, a tela mostra "Sua sessão expirou", e o que foi digitado fica num rascunho no `sessionStorage`, amarrado ao `userId`, que volta depois do login. Outra conta nunca vê esse rascunho.
- **Rotas privadas** (`/checkout`, `/profile`, `/profile/wallets`, `/favorites`, `/orders/:id`): a guarda fica no `beforeLoad` da rota, não em esconder botões. Sem sessão, o usuário vai para o login com `?redirect=`, que só aceita caminhos internos (contra *open redirect*), e volta para onde ia.
- **Logout e troca de usuário:** removem o token, todo o cache privado (`['me']` e o carrinho) e a conexão Socket.IO da sessão anterior. Login ou logout em **outra aba** também é percebido, pelo evento `storage`.
- **Senhas:** o mock guarda `sha256(salt + ":" + senha)` com um salt por usuário. A senha nunca é armazenada.

## Estado do carrinho

- **Fonte da verdade no servidor (mock),** inclusive para visitantes, via `X-Cart-Id`. O carrinho sobrevive ao F5. No login, `POST /cart/merge` junta os itens do visitante aos da conta, respeitando o estoque.
- **Atualização otimista da quantidade:** o "+" e o "−" mudam a tela na hora e mandam o *delta* para a API. As mutations do carrinho entram numa fila (`scope: { id: 'cart' }`) e são enviadas em ordem. Cada resposta traz `version`, e uma resposta com versão menor que a já aplicada é descartada, então cliques rápidos nunca terminam num número errado. Em caso de erro, o estado volta ao anterior e aparece um aviso.
- **Avisos por item** vindos da API: preço mudou, estoque insuficiente, esgotado. O resumo (subtotal, desconto, taxa de rede por rede presente no pedido, total) é sempre o que a API calculou.
- **No pagamento,** a cotação (`GET /checkout/quote`) é revalidada. Se o `id` mudou entre a revisão e o envio, a API responde `QUOTE_CHANGED` e o usuário confirma de novo.

## Estratégia de cache (TanStack Query)

- **Chaves em árvore:**
  - públicas em `['nfts', …]` (`list` + parâmetros, `facets`, `featured`, `detail` + id, `related`, `reviews`);
  - privadas em `['me', userId, …]` (favoritos, carrinho, cotação, pedidos, perfil, carteiras);
  - `['session']` e `['cart', 'guest']`.

  Isso dá **isolamento por usuário e por parâmetros**, e permite invalidar por prefixo. Por exemplo, desfavoritar invalida `['me', id, 'favorites']`, e isso já atualiza a lista de favoritos, que fica debaixo dessa chave.
- **`staleTime` de 30 s:** preços em tempo real chegam pelo Socket.IO, não por refetch.
- **Retry:** só para falhas transitórias, até 2 vezes.
- **Cancelamento:** o `signal` do Query vai para o Axios. Ao trocar de filtro, a resposta antiga é cancelada ou descartada, então respostas fora de ordem nunca sobrescrevem a atual.
- **`placeholderData`:** ao trocar de página ou filtro, a lista anterior continua na tela, com indicação de atualização em segundo plano, até a nova chegar.
- **Preload:** o loader da rota faz `prefetchQuery` sem `await` (a tela abre com skeleton) e o router pré-carrega no hover dos links (`defaultPreload: 'intent'`).
- **Atualização otimista com rollback:** favoritos e a quantidade no carrinho.
- **Invalidação depois de mutations e eventos:** cada mutation invalida as chaves que afetou. Os eventos seguem as regras da seção anterior.

## Estado na URL

Busca, filtros (categoria, rede, faixa de preço), aba, ordenação e página ficam nos search params, validados com Zod (`.catch` ignora valores quebrados em vez de quebrar a tela). Valores padrão saem da URL. Trocar qualquer filtro volta para a página 1. Tudo sobrevive ao F5 e ao "voltar" do navegador. A edição escolhida no detalhe (`?edition=1-10`) e o modal de login (`?auth=entrar`) também ficam na URL.

## Mocking (MSW)

- **Banco:** `src/mocks/db.ts`, em memória e espelhado no `localStorage` (`kurio:mock-db`, com versão de schema). O seed é determinístico: 48 NFTs com variedade de categorias, redes, raridades, preços e estoques; 2 usuários, com carteiras e avaliações.
- **Consistência:** o mesmo banco alimenta catálogo, favoritos, carrinho, perfil, carteiras e pedidos, e as mudanças nele aparecem na REST e nos eventos.
- **Cenários de rede:** um middleware listado primeiro aplica latência e falhas a todas as rotas, exceto as `__dev`. Os cenários são configuráveis pelo painel ou por `PUT /api/__dev/scenarios`, ficam salvos e são reproduzíveis. O reset restaura o seed inteiro. Veja o README.
- **No deploy:** o MSW roda também no build de produção (o desafio exige o deploy com mocks). A tela é desenhada sem esperar o mock: as requisições aguardam `mocksReady` (`lib/mocks-ready.ts`), e o mock começa depois da primeira pintura com conteúdo.
- **Por que MSW 2:** o `@mswjs/socket.io-binding` exige o MSW 2.x, e é ele que permite simular o Socket.IO na camada de rede, com o cliente real.

## Performance e Lighthouse

Medição oficial com `npm run lighthouse`: mediana de 3 execuções, build de produção, mocks no cenário padrão e perfis oficiais do Lighthouse 13.6.0, no Chromium 156. Ambiente: Windows 11, Intel i5-8265U, 8 GB, com `benchmarkIndex` entre 1450 e 1680 e nenhuma execução descartada. Os números completos estão em [lighthouse/RESULTADOS.md](lighthouse/RESULTADOS.md) e os relatórios HTML/JSON em `lighthouse/reports/`.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | Desktop | **99** | 100 | 100 | 100 | 0,96 s | 0,002 | 0 ms |
| Detalhe | Desktop | **99** | 100 | 100 | 100 | 1,04 s | 0 | 0 ms |
| Início | Mobile | **77** | 100 | 100 | 100 | 4,13 s | 0,001 | 376 ms |
| Detalhe | Mobile | **67** | 100 | 100 | 100 | 4,61 s | 0 | 632 ms |

**Abaixo da meta: performance no mobile (meta ≥ 90).** O perfil mobile simula 4G lento e uma CPU 4× mais lenta que a da máquina que mede. As causas foram medidas por perfil de CPU, filmstrip e builds de diagnóstico:

1. **O MSW roda no navegador, em produção.** O README exige o deploy com mocks. O service worker passa toda requisição pela página, e o mock precisa baixar, avaliar e iniciar.
2. **Custo mínimo de uma SPA React.** Mesmo sem dados, a Home leva cerca de 1,7 s de CPU (4×) até a primeira pintura: react-dom, router, Query e cerca de 580 elementos. Num build de diagnóstico **sem o mock** (não entregue), o mobile ficou em 40–46, o que mostra que o custo não vem só do MSW.
3. **Detalhe:** o maior elemento é a imagem do NFT, e o endereço dela vem da API. A cadeia JS do app → mock → API (latência padrão de 100–400 ms) → render → imagem só encurtaria com dados no servidor (SSR ou backend real), o que contraria o mock no navegador exigido pelo README.

**Otimizações aplicadas,** todas valendo para qualquer usuário, sem atalhos para a auditoria:

- `robots.txt` real: SEO de 92 para 100;
- esqueleto do detalhe com a forma da página pronta: CLS de 0,209 para 0;
- substituição do `tough-cookie` por um pote de cookies leve, só para o MSW: o chunk do mock foi de 173 para 53 KB gz e deixou de calcular cookies para cada handler em cada requisição;
- tela desenhada antes do mock;
- seções abaixo da dobra montadas depois da pintura;
- rodapé, modal de login e menu da conta sob demanda: chunk principal de 157 para 106 KB gz;
- primeira montagem em `startTransition`.

Resultado: Home mobile de 70 para 77.

**Testadas e desfeitas por não terem ganho medido:** mudar a ordem de carregamento entre o app e o mock sem esperar a pintura.

**Próximo passo, fora do escopo atual:** pré-renderizar o HTML da Home no build (SSG). A primeira pintura deixaria de depender de JavaScript, e pela conta das métricas a Home mobile chegaria perto de 90. O detalhe seguiria limitado pelo item 3.

**Ambiente:** o resultado depende da máquina que mede. Numa CPU mais rápida, os números do mobile sobem, porque a lentidão de 4× é aplicada sobre ela. Por isso o `benchmarkIndex` de cada execução fica registrado, e execuções com a CPU degradada (< 600) são repetidas.

## Acessibilidade

- Navegação completa por teclado, foco visível e link "Pular para o conteúdo".
- Foco preso e devolvido em modais e gavetas (Radix), incluindo o modal de login, que devolve o foco a quem o abriu.
- Rótulos em todos os campos, com erros ligados por `aria-describedby` e anunciados.
- Avisos de mutations e de tempo real por toasts com `aria-live`.
- Estados que não dependem só da cor: sublinhado nos filtros, ponto no item ativo da barra inferior, risco na edição esgotada.
- Alvos de toque de pelo menos 24 px (WCAG 2.5.8) e contraste verificado em todas as telas.
- Sem rolagem horizontal de 320 a 1440 px, com testes em 320, 390, 768 e 1440. Os 320 px equivalem a 400% de zoom numa tela de 1280 px.
- Skeletons respeitam `prefers-reduced-motion`.
- **Carrossel do Hero:** troca automática a cada 6 s, com as regras do padrão Carousel do WAI-ARIA APG (`aria-roledescription`, slides `inert`, `aria-live` desligado enquanto gira). Ele **pausa** com o mouse em cima ou com o foco dentro, **para de vez** depois de uma troca manual e não gira com `prefers-reduced-motion` (WCAG 2.2.2). O botão de pausar foi removido por decisão de UX.

## Decisões de UX

- O modal de login abre por cima da página atual, por `?auth=` na URL: o "voltar" do navegador fecha o modal, e depois do login o usuário continua onde estava.
- "Comprar" no detalhe leva ao carrinho, e o ícone de carrinho do mobile adiciona sem sair da página.
- O pagamento tem uma etapa de **revisão** (diálogo) antes do envio, exigida pelo README. Qualquer mudança de preço, estoque, cupom ou taxa exige nova confirmação.
- Pedido pendente e recusado têm telas próprias, e a confirmação só aparece para pedidos confirmados pela simulação.
- Ações fora do escopo (Criadores, Aprenda, ajuda, redes sociais, login social, "Esqueceu a senha?", Atividade, Ofertas, Arquivos, Suporte, escanear) aparecem como **"Em breve"** com `aria-disabled`, sem aparentar sucesso.
- O limite é de 10 unidades por pedido, por edição, e a quantidade se ajusta sozinha ao estoque da edição escolhida.

## Limitações

- **Transporte Socket.IO só WebSocket:** o binding do MSW não simula long-polling nem rooms. O mock guarda as conexões e filtra os eventos por usuário.
- **Dados por navegador:** o "backend" vive no `localStorage` de cada navegador. Contas e pedidos não se compartilham entre dispositivos.
- **Token no `localStorage`:** num backend real seria um cookie `HttpOnly`. Aqui ele é necessário para o mock ler o token.
- **Hash das senhas:** SHA-256 com salt, feito no navegador. Num backend real, seria bcrypt ou argon2 no servidor.
- **Pote de cookies leve no lugar do `tough-cookie`** (`src/mocks/cookie-jar-lite.ts`): cobre domínio, caminho e expiração, o suficiente para o MSW. O app não usa cookies.
- **Preços sempre em ETH,** mesmo em Polygon e Solana, como no Figma.
- **Baselines visuais só do Windows:** em CI Linux, gere as suas com `npm run test:e2e:update`.
- **Performance no mobile** abaixo da meta (veja acima).

## Desvios do Figma

| Desvio | Motivo |
|---|---|
| Entre 768 e 1023 px (tablet) vale o layout mobile | O Figma não tem frame de tablet, e o README pede testes em 768 px. |
| Perfil, Carteiras e Confirmação no mobile: adaptados do desktop, com abas no topo no perfil | Não há frames mobile dessas telas, e o README exige que funcionem. |
| Abaixo de 390 px, o Hero, as abas e o menu do perfil encolhem | O Figma só desenha 390 px. Em 320–360 px, o texto vazava e itens saíam da tela. |
| O Footer aparece também no mobile, empilhado; Promos e Blog também, abaixo do catálogo | O frame mobile termina na primeira tela. |
| O banner "NFT em destaque" não aparece no mobile | O frame mobile não o mostra. |
| Hero com 3 slides, setas no desktop e troca automática, sem botão de pausar | As 3 bolinhas indicam um carrossel. Os slides 2 e 3 reaproveitam os temas das Promos. Navegar só pelos pontos era pouco acessível. |
| A bolinha do slide atual é mais forte, e os pontos ficam a 24 px | O atual precisa se destacar; alvo de toque de 24 px. |
| O h1 da Home é escondido, e os títulos do Hero são h2 | O título do carrossel muda; o título da página não deveria mudar junto. |
| A imagem do "NFT em destaque" tem os 4 cantos arredondados | No Figma, só os de cima, diferente de todas as outras imagens. |
| Item ativo da barra inferior com um ponto; filtros marcados sublinhados; edição esgotada riscada | Estados que não dependem só da cor. |
| Abas com 14 px no mobile; a aba do detalhe se chama "Avaliações (19)" | Com o tamanho do Figma, o texto encosta ou estoura a borda em 390 px. |
| No mobile, a ordenação fica dentro do painel de filtros | O frame mobile não mostra onde ordenar. |
| O selo de raridade aparece só para "Raro" e "Lendário" | O Figma mostra só "RARO". "COMUM" em todo card seria ruído. |
| A paginação tem "anterior" e reticências | O Figma mostra só a página 1 de 4. |
| As contagens da sidebar vêm da API (`/nfts/facets`) | As do Figma (33, 12, 65…) não correspondem ao seed de 48 NFTs. |
| Um card sem nome no Figma virou "Golden Echo #121"; a galeria repete a arte nas miniaturas | O arquivo só tem 4 artes. |
| O detalhe mostra o estoque da edição e a mensagem de limite por pedido | O README exige tratar edição indisponível e limite de quantidade. |
| "Contrato" e "Direitos autorais" com os textos destrocados | No Figma eles estão trocados. |
| "Mais desta coleção" mostra primeiro a mesma coleção | No Figma aparecem artes de coleções diferentes. |
| O selo de nota "4,8 (19)" aparece inteiro | No Figma o texto vaza e aparece cortado. |
| Os textos do Blog e do 2º card das Promos aparecem inteiros; o Blog ocupa os 1200 px | No Figma estão cortados ou sobram 56 px vazios. |
| Login e cadastro com rótulos (`<label>`) e um X para fechar no mobile | O Figma só tem placeholders, e o login mobile não tem saída. |
| Logado, "Entrar" vira o primeiro nome, com menu (perfil, favoritos, carteiras, sair) | O Figma não desenha o header de usuário logado. |
| O overlay do modal escurece a página, sem desfoque | Como no Figma (o shadcn aplicava `backdrop-blur`). |
| A coluna "Edições" do carrinho e do recibo virou "Quantidade"/"Qtd.", e cada linha mostra a edição | No Figma a coluna mostra a quantidade; o mesmo NFT pode estar em várias edições. |
| Botão "−" apagado na quantidade mínima | No Figma "−" e "+" são iguais mesmo quando não dá para diminuir. |
| Taxa de rede por rede presente no pedido (Ethereum 0.016, Polygon 0.002, Solana 0.001) | O Figma só mostra a de Ethereum. |
| Avisos de preço alterado, estoque insuficiente e esgotado; cupom aplicado com "Remover" | Não estão no Figma, mas o README exige. |
| "Código de indicação" é opcional | Obrigatório, impediria a compra de quem não tem indicação. |
| O checkout mobile tem o formulário do colecionador; "Carteira cadastrada" aparece também no desktop | O README exige os dados do colecionador; as carteiras cadastradas vêm do frame mobile. |
| "Usar outra carteira?" é caixa de seleção; "ENS ou carteira secundária" tem rótulo visível | O Figma usa um rádio para uma escolha sim/não e só um placeholder no campo. |
| A 1ª opção de carteira é o WalletConnect | No Figma, a 1ª opção é o selo decorativo "METAMASK · WALLETCONNECT · COINBASE". |
| Selo das carteiras do rodapé com 11 px, como lista | No Figma, 9 px (ilegível). Como lista, o leitor de tela anuncia os itens. |
| Revisão do pedido (diálogo) e telas de pedido pendente e recusado | O README exige revisão e os três estados; o Figma só desenha a confirmação. |
| O formulário de carteira tem só os campos da carteira; a senha tem um botão próprio | No Figma ele repete campos do perfil e há um "Salvar" para tudo. |
| Itens fora do escopo aparecem como "Em breve"; "Lista de interesse" leva a `/favorites` | O README pede que ações fora do escopo não aparentem sucesso. |
| Os formatos de número seguem o Figma ("1.19 ETH" nos preços) | O próprio Figma é inconsistente. |
