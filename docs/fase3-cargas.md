# Fase 3, etapa 5 — Divisão Cargas: proposta para aprovação

Rascunho de 2026-09-24. Nada disto está implementado. Os números marcados como **ajustável** serão calibrados no rebalanceamento do fim da Fase 3.

## 1. Cargueiros

Mesmo método de conversão das outras aeronaves (âncora ATR 72-600: 2,44 R$ por US$ de valor; leasing 5,0 R$/dia por US$/dia; combustível R$ 4,43/kg). Os três primeiros já estavam aprovados em `fase3-aeronaves.md`; os dois novos são o **Caravan Cargo** (seu pedido) e o **SkyCourier cargueiro**, que é a versão de carga do avião que você citou.

| | Caravan Cargo (208B EX cargueiro) | SkyCourier cargueiro | ATR 72-600F | 737-800BCF | 767-300F |
|---|---|---|---|---|---|
| Carga real | **1.447 kg** de carga paga máxima (Cessna), com cesto ventral (*cargo pod*) de até 494 kg dentro desse total | **3.039 kg**, três contêineres LD3, 25 m³ (Cessna) | 9,2 t | 24 t | 57 t |
| **No jogo: carga** | **1,4 t** | **3,0 t** | 9,2 t | 24 t | 57 t |
| Velocidade | 343 km/h (Cessna) | 389 km/h (Cessna) | 510 | 840 | 850 |
| Alcance real | 1.689 km máximo (Cessna) | 1.741 km máximo (Cessna) | 1.908 km com carga máxima | 3.700 km com carga máxima | 6.110 km com carga máxima |
| **No jogo: alcance** | 1.300 km (com carga cheia, **estimativa**) | 1.400 km (com carga cheia, **estimativa**) | 1.900 | 3.700 | 6.100 |
| Decolagem real | 658 m (426 m de corrida) | 823 m (527 m de corrida) | como o ATR 72 | — | — |
| **No jogo: pista mínima / terra** | 700 m / **sim** | 900 m / não | 1.000 m / não | 1.600 m / não | 2.200 m / não |
| **No jogo: preço** | R$ 6,5 mi | R$ 18,9 mi | R$ 59 mi | R$ 37 mi | R$ 12 mi (convertido e antigo) |
| **No jogo: leasing/dia** | R$ 4,4 mil (*) | R$ 12,7 mil (*) | R$ 29,6 mil | R$ 24,7 mil | R$ 14,8 mil |
| **No jogo: combustível/km** | R$ 2,80 (o cesto dá arrasto) | R$ 4,10 | R$ 7 | R$ 13,30 | R$ 28 |
| **No jogo: tripulação/h** | R$ 500 (1 piloto, **estimativa**) | R$ 800 (**estimativa**) | R$ 1.200 | R$ 2.600 | R$ 5.000 |
| **No jogo: utilização** | 11 h/dia | 12 h/dia | 14 h/dia | 15 h/dia | 16 h/dia |
| Licença | Táxi aéreo | Táxi aéreo | Regional | Nacional | Internacional |

(*) Sem leasing público: regra de ~1% do valor por mês, como no Caravan e no SkyCourier de passageiros.

**Onde cada um entra:** Caravan Cargo e SkyCourier para malote, e-commerce e cidades pequenas (inclusive pista de terra no Caravan); ATR 72-600F na carga regional; 737-800BCF entre capitais; 767-300F para Miami e rotas internacionais.

## 2. Rotas de carga

- **Rota separada:** `Route.kind = 'pax' | 'cargo'`. Cargueiro só voa rota de carga e avião de passageiros só voa rota de passageiros. Pode existir uma rota de passageiros e uma de carga no mesmo par.
- **Mesmos slots** da rota de passageiros (é preciso ter slot nos dois aeroportos). O criador de rotas ganha a escolha Passageiros/Carga.
- **Hub vale igual para manutenção e pernoite.** As conexões de hub **não** valem na carga, que não faz conexão de passageiro. O hub de carga tem a vantagem dele pelo peso logístico (abaixo).

### Demanda, em toneladas por dia

`demanda (t/dia) = 0,1 × porte A × porte B × peso logístico A × peso logístico B × fator de distância` (**ajustável**)

- **Peso logístico por aeroporto** (padrão 1,0):
  - Viracopos (VCP): **3,0**, o maior terminal de carga do país;
  - Guarulhos (GRU) e Manaus (MAO, Zona Franca): **2,5**;
  - Galeão (GIG): 1,5;
  - Confins (CNF), Recife, Fortaleza, Salvador, Porto Alegre, Curitiba e Belém: 1,2 a 1,3;
  - Miami (MIA): 2,5, a principal porta de carga Brasil–EUA.
- **Distância:** pesa ao contrário da de passageiros. Abaixo de 400 km a carga vai de caminhão (×0,3). Acima de 1.500 km o avião ganha (×1,2).
- **Cidades remotas** (porte 1 e 2, Amazônia): a carga aérea é quase a única opção, então ganham ×1,5 de demanda e o prêmio de tarifa das rotas remotas. É o nicho do Caravan Cargo.

Exemplos com a fórmula: GRU–MAO ~45 t/dia (um 737-800BCF com um voo por dia leva 48 t, ida e volta); VCP–REC ~20 t/dia (um ATR 72-600F); um par porte 6 com uma cidade remota de porte 2, ~2 t/dia (um Caravan Cargo).

### Receita e concorrência

- **Tarifa de referência por tonelada:** `R$ 1.000 + R$ 2 × km` (**ajustável**). Por exemplo, GRU–MAO (2.690 km) fica em ~R$ 6.400/t, cerca de R$ 6,40 por kg. O jogador ajusta a tarifa como nas rotas de passageiros.
- **Sem reputação nem serviço de bordo.** O que pesa é a **pontualidade** (condição média dos cargueiros da rota) e a **frequência**.
- **Concorrência:** uma nova concorrente fictícia, **Rota Norte Cargo**, com reação igual à da IA de passageiros (a cada 30 dias de rota).
- **Custos:** combustível, tripulação, leasing e desgaste como nos outros aviões, mais uma **taxa de manuseio** por tonelada (R$ 120/t no Brasil; no exterior, cotada em dólar).

### Contratos

- **Oferta:** de tempos em tempos (a cada 60 a 90 dias, sorteado), chega uma proposta de um cliente fictício. Exemplo: *"Malote Nacional: 4 t/dia entre GRU e REC por 180 dias, R$ 35 mil/dia fixos"*.
- **Resposta:** o jogador aceita ou recusa.
- **Cumprimento:**
  - todo dia, se a companhia tiver capacidade de carga voando nesse par maior ou igual à exigida, recebe o valor fixo, além da receita normal da rota;
  - se faltar capacidade por 7 dias seguidos, o contrato é rompido, com multa (10 dias do valor) e perda de reputação.
- **Clientes fictícios:** Malote Nacional (postal), CompraJá (e-commerce), Farmavida (remédios, paga mais e exige condição dos aviões > 70), Polo Eletrônico (Manaus), Frutas do Vale (Petrolina, sazonal).
- **Pequeno porte:** recebe contratos pequenos (1 a 2 t/dia, cidades remotas), feitos para o Caravan Cargo.

### Carga no porão (opcional)

Com a divisão aberta, as rotas de **passageiros** também levariam um pouco de carga no porão: cerca de 1 t por voo em narrowbody e 8 t em widebody, com receita simples pela tarifa de referência e sem avião extra. É realista (a maior parte da carga aérea do Brasil vai no porão), mas aumenta o lucro de quem já é grande. Por isso é opcional.

## 3. Interface

- **Rotas:** filtro Passageiros/Carga na lista; ícone de caixa nas rotas de carga; no editor, tarifa por tonelada e "t transportadas/dia".
- **Criador de rotas:** escolha Passageiros/Carga; só mostra aviões do tipo certo.
- **Mercado:** cargueiros na lista de aeronaves, com a coluna "Assentos" mostrando toneladas, e travados enquanto a divisão estiver fechada.
- **Divisões:** a Cargas deixa de ser "em breve" e ganha a lista de contratos oferecidos e ativos.
- **Finanças:** linha "Receita de carga" separada da de passagens.

## 4. Decisões para você

1. **Quem pode abrir a divisão Cargas.** Os três primeiros cargueiros continuam exigindo cada um a sua licença.
   - **Recomendado:** qualquer modelo, desde a licença Regional (inclusive o Pequeno porte com Táxi aéreo). O preço seria **R$ 8 mi** e só os cargueiros da própria licença ficam liberados. É o que faz o Caravan Cargo ter sentido: o Pequeno porte (R$ 5 mi de capital) nunca chegaria à licença Nacional só para abrir a carga.
   - **Alternativa:** como no plano original, só com a licença Nacional, por R$ 30 mi. Nesse caso, o Caravan Cargo e o SkyCourier cargueiro só servem para quem já é grande.
2. **Carga no porão das rotas de passageiros:** entra agora, ou fica de fora?
3. **Contratos:** do jeito proposto (oferta aleatória, cumprimento diário, multa se romper)?
4. **Números da tabela** (Caravan Cargo 1,4 t e SkyCourier cargueiro 3,0 t): aprovados?

## 5. Fontes

- Cessna Grand Caravan EX, especificações oficiais (carga paga 1.447 kg, 343 km/h, 1.689 km, decolagem 658 m): https://cessna.txtav.com/en/turboprop/grand-caravan-ex
- Cesto ventral do Caravan (111,5 pés³, até 1.090 lb): https://www.aircraftcostcalculator.com/AircraftOperatingCosts/5/Cessna+208B+Grand+Caravan-Cargo+Pod e https://en.wikipedia.org/wiki/Cessna_208_Caravan
- Cessna SkyCourier cargueiro, especificações oficiais (3.039 kg, três LD3, 25 m³, 389 km/h, 1.741 km, decolagem 823 m): https://cessna.txtav.com/en/turboprop/skycourier-freighter
- SkyCourier, dados gerais e preço de lançamento: https://en.wikipedia.org/wiki/Cessna_408_SkyCourier
- Demais cargueiros: fontes em `fase3-aeronaves.md`, seção 4.
