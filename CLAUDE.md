# Asa Norte — jogo de gestão de companhia aérea

Você vai desenvolver, a partir de um protótipo funcional, um jogo web single-player de gestão de companhia aérea. Leia este documento inteiro antes de escrever código. Ao terminar cada fase, pare, resuma o que foi feito e espere minha confirmação antes de seguir para a próxima.

## 1. Visão

O jogo mescla a profundidade gerencial de Airport CEO com uma interface extremamente direta, rápida e focada em texto e ícones, inspirada em FootSim (https://www.footsim.com.br/) e Planalto (https://planalto.fun/). O jogador não constrói o aeroporto fisicamente. Ele gerencia frota, rotas, finanças e crises em uma UI limpa estilo dashboard. O status da empresa deve ser entendido batendo o olho: tabelas organizadas, barras de progresso, nada de blocos longos de texto.

Idioma de toda a interface: português do Brasil. Moeda: reais (R$). Datas no formato brasileiro, com o jogo começando em 1º de janeiro de 2026.

## 2. Material de referência

O arquivo `reference/prototipo.html` é um protótipo jogável completo, em um único HTML (React 18 via UMD + htm, sem build). Ele é a **fonte da verdade para regras, fórmulas, constantes e textos**. As seções 5 a 9 abaixo transcrevem essas regras, mas em caso de divergência, abra o protótipo e confira.

Não copie a estrutura do protótipo. Ele é um arquivo monolítico com o motor e a UI juntos. O objetivo é portar para um projeto profissional, tipado, testado e modular, mantendo o mesmo comportamento de jogo na Fase 1.

## 3. Stack e decisões técnicas

Tudo roda no cliente, sem backend.

- Vite + React 18 + TypeScript em modo `strict`.
- Zustand para o estado global, com middleware `immer` para que o motor possa escrever mutações legíveis sobre um rascunho.
- Persistência em IndexedDB via `idb-keyval`, com fallback para `localStorage` se o IndexedDB falhar. Todo acesso ao armazenamento dentro de `try/catch`.
- Vitest para testes unitários do motor.
- ESLint + Prettier.
- CSS com variáveis (design tokens) em arquivos `.css` por componente ou CSS Modules. Sem biblioteca de componentes e sem Tailwind: o visual é próprio e minimalista.
- Fontes Barlow e Barlow Condensed via `@fontsource`, sem dependência de CDN.
- Ícones em SVG próprio (um componente `Icon` com um mapa de paths de 24×24), como no protótipo.
- Deploy estático (deve funcionar com `npm run build` servido de qualquer host estático, inclusive em subpasta, então configure `base` relativo no Vite).

### Arquitetura

```
src/
  engine/              ← lógica pura, zero React, zero DOM
    data/
      airports.ts
      aircraft.ts
      licenses.ts
      service.ts
      events.ts
    types.ts           ← GameState, Route, Plane, Modifier, DayReport...
    rng.ts             ← gerador pseudoaleatório com semente (mulberry32)
    formulas.ts        ← dist, fairPrice, baseDemand, maxFreq, maintCost...
    simRoute.ts
    tick.ts
    actions.ts         ← cada ação retorna string de erro ou null
    events.ts          ← pickEvent, resolveEvent
    offline.ts         ← catchUp
    newGame.ts
    format.ts          ← fmtMoney, fmtDate
  store/
    gameStore.ts       ← Zustand: game, ui (aba, toast, modais), ações que chamam o engine
    persistence.ts     ← save/load, versionamento e migrações
    loop.ts            ← game loop com requestAnimationFrame
  ui/
    components/        ← Bar, Money, Btn, Icon, Pill, Segmented, Stepper, Empty, Toast
    layout/            ← TopBar, Tabs (topo no desktop, barra inferior no mobile)
    screens/           ← NewGame, Painel, Rotas, Frota, Mercado, Financas
    overlays/          ← EventCard (swipe), OfflineSummary, GameOver
  styles/
    tokens.css
    base.css
scripts/
  sim.ts               ← simulação headless de balanceamento (ver seção 11)
tests/
  engine/*.test.ts
```

### Regras do motor

1. O motor não importa nada de React nem do DOM. Tem que rodar no Node, dentro do Vitest e do script de simulação.
2. Toda aleatoriedade passa pelo `rng.ts`, com a semente guardada no `GameState`. Isso torna testes, simulações e o cálculo offline reproduzíveis. (O protótipo usa `Math.random`; esta é uma melhoria intencional.)
3. Ações do jogador são funções `(state, ...args) => string | null`. `null` significa sucesso; uma string é a mensagem de erro que a UI mostra em um toast.
4. O `GameState` é 100% serializável em JSON: nada de funções, classes ou `Date` dentro dele. Os eventos ficam no estado só pelo `id`; o efeito deles é resolvido pelo catálogo em `data/events.ts`.

## 4. Estado do jogo

```ts
GameState {
  v: number                  // versão do save, para migrações
  seed: number               // estado do RNG
  name: string; hub: AirportCode
  day: number                // começa em 1
  cash: number; debt: number
  reputation: number         // 0–100, começa em 50
  fuelIdx: number            // índice do querosene, começa em 1
  license: 0 | 1 | 2
  slots: AirportCode[]       // começa com [hub], de graça
  fleet: Plane[]; routes: Route[]
  mods: Modifier[]           // { type, value, until }
  history: { day, cash, profit, rep }[]   // últimos 120 dias
  log: { day, text, tone }[]              // últimas 60 entradas; tone: good|bad|warn|info|event
  nextEvent: number          // primeiro evento no dia 18
  pendingEvent: string | null
  usedEvents: Record<string, number>      // último dia em que cada evento saiu
  lastDay: DayReport | null
  speed: 0 | 1 | 2 | 4
  savedAt: number            // timestamp real
  gameOver: boolean
}
Plane { id, reg, model, owned, condition (0–100), maint (dias restantes), hours, since }
Route { id, from, to, dist, planeId | null, freq, price, priceJ, service (0|1|2), ai, opened, last }
Modifier.type: 'fuel' | 'demand' | 'salary' | 'share' | 'halt' | 'wear'
```

Caixa inicial: R$ 12 milhões. Matrículas no formato `PR-XXX` com letras sem I e O, únicas na frota.

## 5. Dados

### Aeroportos (código, cidade, lat, lon, porte 1–10, internacional)

| Código | Cidade | Lat | Lon | Porte | Int. |
|---|---|---|---|---|---|
| GRU | São Paulo | -23.43 | -46.47 | 10 | não |
| GIG | Rio de Janeiro | -22.81 | -43.25 | 9 | não |
| BSB | Brasília | -15.87 | -47.92 | 8 | não |
| CNF | Belo Horizonte | -19.63 | -43.97 | 7 | não |
| SSA | Salvador | -12.91 | -38.33 | 7 | não |
| REC | Recife | -8.13 | -34.92 | 7 | não |
| FOR | Fortaleza | -3.78 | -38.53 | 7 | não |
| POA | Porto Alegre | -29.99 | -51.17 | 7 | não |
| CWB | Curitiba | -25.53 | -49.18 | 6 | não |
| VCP | Campinas | -23.01 | -47.13 | 6 | não |
| FLN | Florianópolis | -27.67 | -48.55 | 6 | não |
| MAO | Manaus | -3.04 | -60.05 | 6 | não |
| GYN | Goiânia | -16.63 | -49.22 | 5 | não |
| BEL | Belém | -1.38 | -48.48 | 5 | não |
| SLZ | São Luís | -2.59 | -44.24 | 4 | não |
| NAT | Natal | -5.77 | -35.37 | 4 | não |
| CGB | Cuiabá | -15.65 | -56.12 | 4 | não |
| THE | Teresina | -5.06 | -42.82 | 3 | não |
| EZE | Buenos Aires | -34.82 | -58.54 | 8 | sim |
| SCL | Santiago | -33.39 | -70.79 | 7 | sim |
| LIM | Lima | -12.02 | -77.11 | 7 | sim |
| MIA | Miami | 25.79 | -80.29 | 9 | sim |
| JFK | Nova York | 40.64 | -73.78 | 10 | sim |
| LIS | Lisboa | 38.77 | -9.13 | 8 | sim |
| MAD | Madri | 40.47 | -3.56 | 8 | sim |
| CDG | Paris | 49.01 | 2.55 | 10 | sim |

Hubs disponíveis no início: BSB, GRU, GIG, CNF, REC, SLZ. Rótulo de dificuldade: porte ≥ 9 "Fácil", 7–8 "Médio", ≤ 6 "Difícil".

### Aeronaves

| Chave | Nome | Tipo | Licença | Y | J | Alcance km | Velocidade km/h | Comb. R$/km | Tripulação R$/h | Leasing R$/dia | Preço R$ | Desgaste %/h voo | Utilização máx. h/dia |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AT7 | ATR 72-600 | Turboélice | 0 | 70 | 0 | 1.500 | 500 | 7 | 1.800 | 28.000 | 55 mi | 0,08 | 15 |
| E295 | Embraer E195-E2 | Jato regional | 1 | 132 | 0 | 4.800 | 830 | 11 | 3.000 | 52.000 | 105 mi | 0,07 | 16 |
| A20N | Airbus A320neo | Narrowbody | 1 | 174 | 0 | 6.300 | 840 | 13 | 3.600 | 68.000 | 145 mi | 0,065 | 17 |
| B38M | Boeing 737 MAX 8 | Narrowbody | 1 | 186 | 0 | 6.500 | 840 | 13,5 | 3.800 | 72.000 | 152 mi | 0,065 | 17 |
| A339 | Airbus A330-900 | Widebody | 2 | 257 | 30 | 13.300 | 870 | 27 | 8.500 | 175.000 | 420 mi | 0,05 | 22 |

### Licenças

| Nível | Nome | Descrição | Custo |
|---|---|---|---|
| 0 | Regional | Turboélices, rotas até 1.500 km | inicial |
| 1 | Nacional | Jatos em qualquer rota doméstica | R$ 25 mi |
| 2 | Internacional | Destinos no exterior, widebodies e classe executiva | R$ 120 mi |

Só é possível comprar o nível imediatamente seguinte ao atual.

### Serviço de bordo

| Índice | Nome | Custo por passageiro Y | Efeito na qualidade |
|---|---|---|---|
| 0 | Básico | R$ 6 | −0,12 |
| 1 | Padrão | R$ 20 | 0 |
| 2 | Premium | R$ 45 | +0,14 |

Passageiro da executiva custa 4× o valor do serviço.

## 6. Fórmulas

- **Distância:** haversine com R = 6371 km, arredondada para inteiro.
- **Rota internacional:** quando qualquer uma das pontas é internacional.
- **Tarifa de referência (fair price):** se d ≤ 3500, `150 + 0,45·d`; senão, `150 + 0,45·3500 + 0,25·(d − 3500)`. Arredondar para múltiplo de 5. Executiva de referência: 3,5× esse valor.
- **Demanda base (pax/dia, total do par):** `14 · porteA · porteB · f`, com f = 0,6 se d < 300; 1 se d < 2500; 0,85 acima disso. Multiplicar por 0,7 se for internacional.
- **Slot:** compra = `porte² · 60.000`; taxa diária = `porte · 800`. Ambos em dobro para aeroportos internacionais. Aeroporto internacional exige licença 2.
- **Tempo de bloco (h):** `d / velocidade + 0,5`.
- **Frequência máxima (idas e voltas/dia):** `floor(utilização / (2 · bloco))`.
- **Manutenção:** custo = `preço · 0,00015 · (100 − condição)`, arredondado para R$ 1.000; duração = `2 + ceil((100 − condição) / 20)` dias.
- **Valor de revenda:** `preço · 0,6 · (0,5 + condição/200)`.
- **Limite de crédito:** `10 mi + 50% do valor de revenda da frota própria`, arredondado para milhão. Juros: 0,06% da dívida por dia. Empréstimos e quitações em blocos de R$ 5 mi.
- **Modificadores:** o valor efetivo de um tipo é o produto de todos os `mods` ativos daquele tipo (`until > day`). `halt` ativo suspende todas as operações.

### Simulação diária de uma rota

A rota não voa (receita zero, mas custos fixos continuam) se não tiver aeronave, se a aeronave estiver em manutenção ou se houver `halt` ativo. Caso contrário:

```
demanda   = demandaBase · mod(demand) · (1 + 0,08 · sen(dia / 365 · 4π))
priceF    = (fair / preço) ^ 2,2
q         = 0,75 + 0,5 · (reputação / 100) + serviço.q  − 0,1 se condição < 50
freqF     = 0,7 + 0,1 · min(freq, 6)
A         = priceF · q · freqF · mod(share)
share     = A / (A + ai)                 // ai = força da concorrência na rota
capY      = assentosY · freq · 2
pax       = round(min(capY, demanda · share))

se a aeronave tem J e licença ≥ 2:
  AJ      = (fairJ / preçoJ) ^ 1,8 · q · freqF
  paxJ    = round(min(assentosJ · freq · 2, demanda · 0,12 · AJ / (AJ + ai)))

horas     = freq · 2 · bloco
receita   = pax · preço + paxJ · preçoJ
combust.  = combKm · d · freq · 2 · fuelIdx · mod(fuel)
tripul.   = tripH · horas · mod(salary)
taxas     = (pax + paxJ) · (internacional ? 80 : 25)
serviço   = pax · custoServiço + paxJ · custoServiço · 4
ocupação  = (pax + paxJ) / (capY + capJ)
```

O "resultado da rota" mostrado na tabela é a receita menos esses custos e menos o leasing diário da aeronave, se for arrendada. Essa é a fórmula central pedida no design: `Lucro = (Passageiros × Preço) − (Combustível + Salários + Leasing)`, acrescida de taxas e serviço.

## 7. Ordem do tick diário

1. `day++`.
2. Índice do querosene: `fuelIdx += (1 − fuelIdx) · 0,02 + ruído uniforme(−0,0125, +0,0125)`, limitado a 0,7–1,6.
3. Simular cada rota e guardar o resultado em `route.last`.
4. Reação da IA, a cada 30 dias por rota: se share > 0,55, `ai += 0,06` (limite 0,8–2,2); senão `ai += (1,2 − ai) · 0,2`.
5. Frota: somar o leasing de toda aeronave arrendada (mesmo parada ou em manutenção). Aeronave em manutenção só decrementa `maint` e, ao zerar, volta com condição 100. Aeronave voando perde `horas · desgaste · mod(wear)` de condição e acumula horas.
6. Pane: aeronave com condição < 25 tem 6% de chance por dia de quebrar. Custo 1,5× a manutenção, fica parada pela duração normal + 2 dias, reputação −3, entrada no diário.
7. Custos fixos: taxa de todos os slots, estrutura `8.000 + 2.500 · aeronaves`, juros.
8. Somar tudo em um `DayReport` (rev, fuel, crew, lease, fees, svc, slots, overhead, interest, maint, pax, profit) e aplicar ao caixa.
9. Reputação: se houver rotas voando, alvo = `38 + serviçoMédio · 12 + (condiçãoMédiaDaFrota − 60) / 3`, limitado a 5–95. A reputação anda 1,5% da distância até o alvo por dia.
10. Remover modificadores vencidos, registrar histórico (máx. 120), cortar diário (máx. 60).
11. Falência: caixa abaixo de −R$ 15 mi encerra o jogo.
12. Eventos (se não for simulação offline): se não há evento pendente e `day ≥ nextEvent`, sortear um evento elegível, marcar como pendente e agendar o próximo para daqui a 20–39 dias.

## 8. Ações do jogador

- **Arrendar:** exige licença do modelo; cobra depósito não reembolsável de 10 diárias de leasing.
- **Comprar aeronave:** exige licença e preço cheio em caixa.
- **Comprar aeronave arrendada (buyout):** 90% do preço.
- **Vender (própria) / devolver (arrendada):** vender credita o valor de revenda; ambos desescalam a aeronave da rota.
- **Manutenção:** tira a aeronave de operação pela duração calculada e cobra o custo.
- **Comprar slot, comprar licença, tomar e quitar empréstimo:** conforme seção 6.
- **Abrir rota:** exige slots nos dois aeroportos, origem ≠ destino, par ainda não existente (em qualquer sentido), rotas até 1.500 km com licença regional, destino dentro do alcance e frequência máxima ≥ 1. Padrões: frequência `min(2, máx.)`, tarifa = referência, executiva = `round(ref · 3,5 / 10) · 10`, serviço Padrão, `ai` = 1,2. Escalar um avião que estava em outra rota o remove de lá.
- **Editar rota:** trocar aeronave (mesmas validações de alcance), frequência (1 a máx.), tarifa (R$ 50–50.000), executiva (R$ 100–150.000), serviço.
- **Encerrar rota:** reputação −1.

Cada ação registra uma linha no diário de bordo com o texto que o protótipo usa.

## 9. Eventos (cartas estilo Planalto)

Cada evento tem id, ícone, título, texto curto (uma ou duas frases), uma condição opcional de elegibilidade e duas opções. Cada opção tem rótulo, uma prévia de impacto (`cash`, `rep`, `fleet`, `ops`, cada um +1 ou −1) e um efeito. Um evento não se repete antes de 120 dias. `escala` = max(1, número de aeronaves). O jogo pausa enquanto houver carta pendente e enquanto a carta de resultado estiver aberta.

| id | Título | Esquerda | Direita |
|---|---|---|---|
| greve | Greve de pilotos | Ceder ao reajuste: salary ×1,15 por 120 dias | Endurecer: halt 3 dias, reputação −6 |
| querosene | Querosene dispara | Travar preço (hedge): paga 250 mil·escala, fuel ×0,9 por 45 dias | Absorver a alta: fuel ×1,25 por 40 dias |
| cinzas | Nuvem de cinzas | Cancelar voos: halt 4 dias, reputação +2 | Manter a malha: 35% de chance de frota −25 de condição e reputação −12 |
| influencer | Vídeo viral | Desculpas e vouchers: −80 mil·escala, reputação +3 | Ignorar: reputação −7 |
| feriado | Feriadão à vista | Subir tarifas: +150 mil·escala, reputação −2 | Voos extras: demand ×1,35 por 10 dias, frota −5 |
| anac | Fiscalização da ANAC | Auditoria completa: −120 mil·escala, frota +10 | Pedir prazo: 45% de chance de multa de 400 mil·escala e reputação −5 |
| guerra | Guerra tarifária | Acompanhar os preços: todas as tarifas −15% | Apostar no serviço: share ×0,8 por 30 dias, reputação +2 |
| passaro | Colisão com pássaro (exige avião disponível) | Inspeção completa: primeiro avião disponível parado 4 dias | Inspeção visual: 40% de chance de −35 de condição nesse avião e reputação −4 |
| patrocinio | Proposta de patrocínio | Recusar: nada | Fechar: −300 mil·escala, reputação +6, demand ×1,08 por 90 dias |
| sistema | Pane no sistema de reservas | Consultoria externa: −90 mil·escala | Esperar a TI: demand ×0,7 por 3 dias, reputação −3 |
| copa | Final no Brasil | Pacotes com desconto: demand ×1,2 por 7 dias, reputação +3 | Tarifa dinâmica: +200 mil·escala, reputação −2 |
| slotbarato | Slot à venda (exige aeroporto elegível sem slot) | Dispensar: nada | Comprar: slot do maior aeroporto elegível pela metade do preço, se houver caixa |

"Frota ±N" aplica a todas as aeronaves que não estão em manutenção, com limite 0–100. Os textos das cartas e dos resultados estão no protótipo; use-os.

Mecânica de swipe: arrastar com dedo ou mouse (pointer events com captura), a carta translada e gira `dx/18` graus. Soltar além de 110 px escolhe a opção; aquém disso, a carta volta. Enquanto arrasta, a metade do canhoto correspondente ao lado fica destacada e o rótulo da opção aparece na lateral da tela com opacidade proporcional à distância. Também deve funcionar com dois botões abaixo da carta e com as setas ← e → do teclado. Depois da escolha, uma carta de resultado mostra o texto do desfecho e o botão "Continuar".

## 10. Save, loop e tempo offline

- **Loop:** `requestAnimationFrame` acumulando tempo real; cada `1000 / speed` ms processa um tick, no máximo 8 por frame. Velocidades: pausado, 1×, 2×, 4× (1× = 1 dia por segundo). Não processa com a aba oculta, com evento pendente, com carta de resultado aberta, com o resumo offline aberto ou em fim de jogo.
- **Autosave:** a cada 5 dias, sempre que surgir evento, após qualquer ação do jogador, ao ocultar a aba e no `pagehide`. Grava `savedAt = Date.now()`.
- **Offline:** ao carregar o jogo ou voltar para a aba, calcular o tempo desde `savedAt`. Cada minuto real fora vale 1 dia de jogo, com limite de 60 dias, e eventos não disparam nesse período. Se passou ao menos 1 dia, mostrar o resumo: tempo fora, dias simulados, resultado em R$ e variação de reputação, com o botão "Voltar ao comando".
- **Versionamento:** chave de save própria com campo `v`. Escreva uma função de migração, mesmo que hoje não haja migração, para que saves antigos não quebrem quando o estado mudar.
- **Tema:** preferência de tema salva separadamente do save do jogo.

## 11. Balanceamento e testes

Crie `npm run sim`, que roda o motor no Node com semente fixa e uma estratégia automática simples para os hubs BSB, GRU e SLZ durante 600 dias: arrendar um ATR, abrir a rota para o aeroporto de maior demanda entre 350 e 1.500 km do hub, sempre que o caixa passar de R$ 8 mi comprar o próximo slot e arrendar outro ATR para uma nova rota, fazer manutenção quando a condição cair abaixo de 45 e escolher o lado dos eventos aleatoriamente. Imprimir caixa, reputação, resultado diário e número de rotas a cada 100 dias.

Referência do protótipo com essa estratégia: BSB e GRU terminam por volta de R$ 160–170 mi no dia 600; SLZ fica no vermelho. A Fase 1 deve reproduzir essa ordem de grandeza.

Testes unitários mínimos: `dist`, `fairPrice`, `baseDemand`, `maxFreq`, `maintCost`, `simRoute` (share, teto de capacidade, executiva só com licença 2), `tick` (leasing cobrado com avião parado, manutenção restaura 100, falência), todas as validações de `openRoute`, `resolveEvent` para cada evento com RNG determinístico, e `catchUp` (limite de 60 dias, sem eventos).

## 12. Identidade visual e UX

### Tokens

| Token | Claro | Escuro |
|---|---|---|
| fundo | #F4F4F6 | #1E1E24 |
| painel | #FFFFFF | #26262D |
| painel 2 | #ECECF0 | #2E2E37 |
| linha | #DCDCE3 | #393943 |
| texto | #1E1E24 | #ECECF1 |
| texto secundário | #686876 | #9C9CAA |
| azul avião (preenchimentos, botões primários) | #005B96 | #005B96 |
| azul para texto | #005B96 | #5AA8DD |
| teal (positivo, rotas) | #00A896 | #00A896 |
| teal para texto | #00806F | #2FCDB8 |
| laranja alerta (manutenção, prejuízo) | #FF6B6B | #FF6B6B |
| laranja para texto | #D8413F | #FF8585 |

O tema segue `prefers-color-scheme`, com botão para forçar claro ou escuro (via `data-theme` no `<html>`). Texto sobre fundo laranja usa #1E1E24.

### Tipografia

Barlow (corpo) e Barlow Condensed (números, títulos, rotas), tipografia de sinalização que conversa com o ambiente de aeroporto. Todos os números usam Barlow Condensed com `tabular-nums`. Rotas escritas como `BSB → CNF`. Sem rótulos em caixa-alta.

### Layout

- **Topo fixo:** marca (quadrado azul girado 45° com avião, como um estabilizador vertical), nome da companhia, data e dia; caixa, resultado de hoje, reputação com barra, índice QAV; controle de velocidade segmentado e botão de tema.
- **Abas:** Painel, Rotas, Frota, Mercado, Finanças. No desktop ficam abaixo do topo, com sublinhado teal na ativa. No mobile (≤ 760 px) viram barra inferior fixa com ícone e rótulo. A aba Frota mostra um contador laranja de aviões com condição < 40.
- **Tabelas estilo escalação do FootSim:** linhas densas, zebradas, com uma faixa vertical colorida na primeira coluna indicando o status (teal = ok, laranja = problema, cinza = parado/manutenção). No mobile, rolagem horizontal com a primeira coluna fixa.
- **Barras:** ocupação em azul, market share em teal, condição em teal (≥ 60), cinza (40–59) ou laranja (< 40).
- **Carta de evento:** o elemento de destaque do jogo. É um cartão de embarque: ícone em quadrado azul, título grande, texto curto, linha picotada com recortes semicirculares nas bordas e um canhoto dividido em duas metades ("← Deslize" / "Deslize →") com rótulo da opção e prévia de impacto (ícones de caixa, reputação, frota, operação com ▲ teal ou ▼ laranja). Entra com uma animação curta de "carta distribuída". O fundo fica desfocado.
- **Movimento:** só em resposta a ações do jogador, e respeitando `prefers-reduced-motion`.
- **Acessibilidade:** foco visível em teal, barras com `role="meter"`, carta com `role="dialog"`, tudo operável por teclado.
- Respeitar áreas seguras do iPhone (`viewport-fit=cover`, `env(safe-area-inset-*)` no topo, na barra inferior e nos overlays).

### Telas

- **Novo jogo:** nome da companhia (padrão "Asa Norte Linhas Aéreas", máx. 32 caracteres), escolha do hub em grade com dificuldade, botão "Iniciar operações".
- **Painel:** faixa de KPIs (resultado do dia, passageiros/dia, frota, rotas); checklist de "Primeiro voo" enquanto não houver rotas (arrendar ATR, comprar slot até 1.500 km, abrir rota); gráfico de área do caixa; lista "Atenção" (modificadores ativos com dias restantes, aviões em manutenção, aviões com condição < 40 com botão de manutenção, aviões parados sem rota com botão para escalar, rotas sem aeronave, rotas no prejuízo); diário de bordo com as 10 últimas entradas.
- **Rotas:** botão "Nova rota" abre um formulário (origem, destino, aeronave, distância, demanda total, tarifa de mercado e mensagem de validação em laranja). Tabela com rota, aeronave, frequência, tarifa, ocupação, market share e resultado/dia. Clicar na linha expande o editor: seletor de aeronave (desabilitando as sem alcance e indicando em qual rota cada uma está), stepper de frequência com máximo, slider de tarifa entre 50% e 160% da referência mostrando a referência, slider de executiva quando aplicável, segmentado de serviço, e uma **previsão ao vivo** (passageiros, share e resultado estimado) recalculada chamando `simRoute` sobre o estado atual. Botão "Encerrar rota" com confirmação.
- **Frota:** matrícula e modelo, status (rota em pílula teal, "Parado" em laranja, manutenção com dias), condição, contrato (leasing/dia ou própria com valor de revenda), ações de manutenção com custo, compra do arrendado e vender/devolver com confirmação.
- **Mercado:** segmentado Aeronaves / Slots / Licenças. Aeronaves bloqueadas aparecem esmaecidas indicando a licença necessária. Slots ordenados por "seus primeiro, domésticos antes, depois por distância do hub". Licenças como sequência com barra de progresso do caixa até o custo da próxima.
- **Finanças:** decomposição do último dia em barras horizontais (receita em teal, custos em laranja, resultado no fim); barras de resultado diário dos últimos 60 dias (positivos acima da linha média, negativos abaixo); bloco de crédito com dívida, limite, juros por dia e botões de tomar e quitar.
- **Fim de jogo:** carta informando por quantos dias a companhia operou e botão "Fundar outra companhia".
- Rodapé discreto com "Recomeçar" (apaga o save, com confirmação).

Textos da interface: voz ativa, frases curtas, sentence case. Botões dizem exatamente o que fazem ("Arrendar", "Abrir rota", "Voltar ao comando"). Estados vazios dizem o que fazer a seguir.

## 13. Fases

**Fase 1 — Porte fiel.** Estrutura do projeto, motor tipado com testes, script de simulação, store, persistência, loop, offline e todas as telas com paridade funcional e visual com o protótipo. Critério de aceite: `npm run test` e `npm run build` sem erros, `npm run sim` na mesma ordem de grandeza do protótipo, e o jogo completo jogável em desktop e em celular.

**Fase 2 — Profundidade.** Proponha um plano antes de implementar, cobrindo:
- Mais de uma aeronave por rota, somando capacidade e frequência.
- Demanda compartilhada: rotas da própria companhia que saem do mesmo aeroporto para destinos próximos devem competir entre si.
- Configuração de cabine (Y/J) por aeronave nos narrowbodies após a licença internacional.
- Mais eventos (meta de 30), incluindo cadeias de eventos em que uma escolha habilita um evento futuro, e eventos sazonais (Carnaval, férias de julho, fim de ano).
- Concorrentes com nome na camada de IA, ainda abstratos, mas visíveis por rota.
- Objetivos e conquistas para dar direção ao jogador.
- Revisão do balanceamento do meio e do fim de jogo; a fase internacional quase não foi testada no protótipo.

**Fase 3 — Polimento.** PWA instalável com funcionamento offline, exportar e importar save em arquivo, onboarding mais guiado, sons opcionais.

## 14. Problemas conhecidos no protótipo

- O evento "Guerra tarifária" reduz todas as tarifas permanentemente em 15%; o jogador precisa reajustar à mão. Avaliar se deve ser temporário.
- Cada rota aceita um único avião.
- Rotas muito curtas (menos de 300 km) com frequência alta dão prejuízo. Isso é intencional, mas a interface poderia sinalizar melhor.
- O hub SLZ talvez esteja difícil demais; confirmar com o script de simulação.
- O protótipo usa `Math.random`, então a simulação não é reproduzível. A versão nova deve usar RNG com semente.

## 15. Como trabalhar comigo

- Comece criando o projeto e mostre a árvore de pastas antes de escrever o motor.
- Commits pequenos, com mensagens em português, um por etapa lógica.
- Se alguma regra deste documento parecer errada ou contraditória com o protótipo, pergunte antes de mudar.
- Ao final de cada fase, rode testes, build e simulação, e me mostre os resultados.

## 16. Decisões tomadas (Fase 1)

Aprovadas antes do início da implementação:

- **Corrigidos em relação ao protótipo:**
  - *Colisão com pássaro → Inspeção completa*: cobra o custo da inspeção (o custo de manutenção do avião) e, ao fim dos 4 dias, **não** restaura a condição para 100 (no protótipo era manutenção grátis).
  - Falência encerra o tick antes do sorteio de eventos (no protótipo a carta podia abrir sobre a tela de falência).
  - O cálculo offline não roda enquanto houver carta de evento pendente ou carta de resultado aberta.
- **Mantidos como no protótipo (candidatos à Fase 2):**
  - Modificadores valem N−1 dias de efeito (`until = dia + N`, checagem `until > dia` depois do `day++`).
  - Abrir rota sem aeronave pula as validações de alcance e do limite de 1.500 km da licença regional.
  - A IA reage em todas as rotas quando `dia % 30 === 0` (calendário global, não idade da rota).
  - Guerra tarifária reduz as tarifas permanentemente.
- Detalhes de UI do protótipo mantidos: contador da aba Frota ignora aviões em manutenção; botão de manutenção desabilitado com condição > 97; lista "Atenção" limitada a 8 itens; sinal de menos tipográfico (−).
- Todas as ações registram linha no diário (inclusive quitar empréstimo); edições de rota não registram, para não poluir o diário a cada movimento de slider.
- Chave de save própria (`asanorte-save`), sem importar saves do protótipo. Tema em `asanorte-theme`.
- TypeScript 6.0 (o typescript-eslint ainda não suporta o 7).
- Projeto fora do OneDrive, em `C:\dev\airlinesim`.
- **Estratégia do `npm run sim`:** rotas sempre saindo do hub; o destino é o aeroporto sem slot com maior demanda base entre 350 e 1.500 km do hub; frequência e tarifa padrão; sem empréstimos; quando os candidatos acabam, para de expandir.

## 17. Decisões da Fase 2

Plano aprovado em 2026-09-23. Ordem: (1) várias aeronaves por rota, (2) configuração de cabine, (3) concorrentes com nome, (4) demanda compartilhada, (5) eventos novos, (6) objetivos e conquistas, (7) balanceamento.

- Concorrentes **fictícios**, sem marcas reais.
- Objetivos dão **só reputação** como prêmio, para não mexer na economia.
- Na etapa de balanceamento, corrigir os comportamentos mantidos na Fase 1 (modificadores N−1 dias, rota sem aeronave sem validação, IA no calendário global) e tornar a guerra tarifária temporária.
- Os textos dos 18 eventos novos passam pela revisão do usuário **antes** de serem implementados.
- Save sobe para `v: 2`, com migração dos saves da Fase 1.
- **Eventos (etapa 5, aprovada em 2026-09-24):** 30 no total (12 do protótipo + 18 em `src/engine/data/moreEvents.ts`, textos em `docs/eventos-fase2.md`). Pedido do usuário: cartas aleatórias e sem aparecer toda hora. Por isso:
  - intervalo entre cartas de 30 a 59 dias (era 20–39); primeira carta no dia 25 (era 18);
  - um evento não se repete antes de 180 dias (era 120); sazonais, no máximo uma vez por ano;
  - sazonais só dentro da janela do calendário, com 60% de prioridade (não 100%);
  - alguns eventos dependem do porte da companhia (3+ aviões, 4+ aviões, 3+ rotas, ter jato), para aparecerem ao longo do jogo;
  - cadeias via `GameState.flags` (save v4); o acordo do sindicato bloqueia a greve de pilotos por 365 dias.
- **Objetivos (etapa 6):** 18 objetivos em ordem de progressão (`src/engine/data/goals.ts`), conferidos no fim de cada dia (inclusive offline). Cumprido, vira conquista (`GameState.achievements`, save v5), dá de 1 a 4 de reputação — nunca dinheiro — e aparece em toast e no diário. O Painel mostra os 3 próximos com progresso e a lista de conquistas.
