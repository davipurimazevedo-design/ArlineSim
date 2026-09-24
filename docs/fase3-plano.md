# Fase 3 — Modelos de negócio: plano para aprovação

Rascunho de 2026-09-24. Nada disto está implementado. Pode editar este arquivo direto.

## 1. Ideia geral

Hoje toda companhia joga do mesmo jeito. Na Fase 3, o jogador escolhe **como** a companhia ganha dinheiro, e cada escolha muda regras, libera coisas novas e cobra um preço.

A proposta tem duas camadas:

| Camada | Quando | Opções |
|---|---|---|
| **Modelo principal** | Na fundação, junto com o hub | Tradicional (o jogo de hoje), Low-cost, Regional, Pequeno porte |
| **Divisões** | Mais tarde, compradas como expansão | Cargas (com a licença Nacional), Base internacional / multinacional (com a licença Internacional) |

Por que assim: os quatro modelos principais mudam o jeito de operar passageiros e se excluem entre si (não dá para ser low-cost e premium ao mesmo tempo). Cargas e multinacional são negócios **a mais**, que qualquer modelo pode abrir quando crescer. Isso também espalha as novidades ao longo do jogo, em vez de tudo aparecer no dia 1.

## 2. Modelos principais

Cada modelo é um conjunto de regras aplicado pelo motor (multiplicadores e travas), sem duplicar o código de simulação.

### Tradicional
O jogo atual, sem mudanças. Serve de referência para o balanceamento.

### Low-cost
- **Ganha:** cabines de alta densidade (cerca de +10% de assentos no mesmo avião); estrutura 30% mais barata; giro mais rápido no solo (+1 h de utilização por dia); a demanda responde mais a preço baixo (elasticidade maior).
- **Perde:** serviço de bordo travado no Básico; sem classe executiva nem widebody; reputação com teto de 70; a Aerovia reage mais forte nas rotas em comum.
- **Jeito de jogar:** tarifa abaixo da referência, muitos voos, custo baixo.

### Regional
- **Ganha:** slots e taxas pela metade em aeroportos de porte ≤ 6; +15% de demanda em rotas que tocam esses aeroportos; concorrência ainda menor em mercados pequenos.
- **Perde:** slots 25% mais caros nos aeroportos grandes (porte ≥ 9); com a licença Nacional, só jatos regionais (E-Jets), sem A320/737; sem licença Internacional.
- **Jeito de jogar:** malha capilar, muitas cidades médias e pequenas, turboélices e E-Jets.

### Pequeno porte (táxi aéreo e aviação regional de nicho)
- **Começo diferente:** capital menor e licença inicial nova, **Táxi aéreo**, que só permite aviões pequenos. Pode evoluir comprando a licença Regional (ATR) e seguir o caminho normal. É um "começar de baixo".
- **Aviões novos (dados a conferir antes de entrar no jogo):**
  - Cessna 208B Grand Caravan EX: ~9 a 12 passageiros, ~340 km/h, alcance ~1.700 km, monomotor turboélice, pista curta.
  - Pilatus PC-12: ~9 passageiros, ~500 km/h, alcance ~3.000 km.
  - Um bimotor de 19 lugares (por exemplo, Let L-410 ou similar), a definir.
- **Aeroportos novos, de porte 1 a 3 e pista curta,** onde só avião pequeno pousa (lista a conferir): Fernando de Noronha (FEN), Jericoacoara (JJD), Porto Seguro (BPS), Bonito (BYO), Parintins (PIN), Tefé (TFF), Altamira (ATM), além de outros do interior e da Amazônia.
- **Regra nova:** tarifa de referência maior em destinos remotos ou turísticos (pouca alternativa de transporte), demanda baixa e forte sazonalidade.
- **Perde:** escala pequena; custo por assento alto; eventos de clima e pista pesam mais.

## 3. Divisões (expansões)

### Cargas (libera com a licença Nacional)
É um **sistema novo**, não só modificadores:
- **Rota de carga:** separada da de passageiros (`Route.kind = 'pax' | 'cargo'`).
- **Demanda em toneladas por dia,** por par de aeroportos. Usa o porte e um peso logístico por aeroporto: GRU e VCP são grandes centros de carga, MAO tem a Zona Franca.
- **Receita por tonelada-km,** sem efeito de reputação nem de serviço de bordo. Pontualidade (condição da frota) e frequência pesam.
- **Cargueiros (dados a conferir):** ATR 72-600F (~8 t), 737-800BCF (~23 t), 767-300F (~52 t); um widebody cargueiro com a licença Internacional.
- **Caravan Cargo** (pedido do usuário em 2026-09-24): versão cargueira do Cessna 208B, para a carga de pequeno porte e o Pequeno porte com a divisão Cargas. Pesquisar dados reais antes de entrar.
- **Contratos:** cartas especiais oferecem receita fixa por N dias, desde que a companhia mantenha capacidade numa rota (por exemplo, contrato postal ou e-commerce).
- **Interface:** filtro Passageiros/Cargas na aba Rotas; cargueiros no Mercado; linha de cargas separada em Finanças.

### Base internacional / multinacional (libera com a licença Internacional)
- **Segunda base fora do Brasil:** a compra custa alto e dá slots e taxas com desconto nesse aeroporto.
- **Aeroportos internacionais novos (lista a conferir):** Bogotá (BOG), Panamá (PTY), Montevidéu (MVD), Assunção (ASU), Orlando (MCO), Londres (LHR), Frankfurt (FRA), Roma (FCO).
- **Câmbio:** um índice de câmbio que oscila como o do querosene. Leasing e custos no exterior passam a ser cotados em dólar.
- **Codeshare:** acordo pago com uma concorrente estrangeira fictícia, que aumenta o share nas rotas internacionais em comum.

## 4. Como fica no código

- `GameState.businessModel` e `GameState.divisions` (save v6, com migração: saves antigos viram "Tradicional", sem divisões).
- `src/engine/data/businessModels.ts` com as regras de cada modelo.
- **Uma função `rules(s)` que o motor consulta:** assentos, elasticidade, estrutura, serviço permitido, aviões e licenças permitidos, custo de slot por aeroporto, demanda por rota. O `simRoute`, o `tick` e as ações leem as regras dali, sem `if` espalhado.
- **Aeroportos ganham** `runway: 'curta' | 'normal'`; **aeronaves ganham** `shortField: boolean`.
- **Cargas:** `simCargo.ts` separado, reaproveitando custos de voo, desgaste e frequência.
- **Tela de novo jogo:** escolha do modelo, com um resumo do que ganha e do que perde.
- **Aba Mercado:** nova seção **Divisões** para comprar Cargas e a Base internacional.

## 5. Eventos e objetivos

- **Eventos:** de 3 a 5 por modelo e por divisão (por exemplo, "Pista alagada" no pequeno porte, "Contrato postal" em cargas, "Câmbio dispara" na multinacional). Os textos passam pela sua revisão antes, como na Fase 2.
- **Objetivos próprios:** 3 a 4 por modelo (por exemplo, "10 cidades pequenas atendidas" no regional, "1.000 t de carga num dia" em cargas).

## 6. Balanceamento

- **Simulação:** ganha uma estratégia "esperta" para cada modelo e cada divisão.
- **Meta:** nenhum modelo dominante. Com a estratégia esperta, a mediana de caixa no dia 1.000 de cada modelo deve ficar a até ±25% da do Tradicional, no mesmo hub. O Pequeno porte, que começa menor, mede-se pela evolução.
- **Divisões:** medidas pelo ganho que dão sobre a mesma companhia sem elas. Precisam valer a pena, mas não dobrar o resultado sozinhas.

## 7. Ordem de implementação

| Etapa | Conteúdo | Tamanho |
|---|---|---|
| 1 | Infraestrutura: modelo no estado, `rules(s)`, escolha na fundação, save v6 | médio |
| 2 | Low-cost e Regional (só regras) | pequeno |
| 3 | Pequeno porte: aviões e aeroportos novos, pista curta, licença Táxi aéreo | médio |
| 4 | Divisões no Mercado + Base internacional (câmbio, aeroportos, codeshare) | médio |
| 5 | Cargas (sistema novo) | grande |
| 6 | Eventos e objetivos por modelo (com revisão dos textos) | médio |
| 7 | Estratégias na simulação e balanceamento entre modelos | médio |

Cada etapa com testes, commit próprio e conferência no navegador, como nas fases anteriores.

## 8. Decisões (todas tomadas; ver CLAUDE.md, seção 18)

Ordem revisada das etapas: 1 e 2 (feitas) → 3 Pequeno porte e aeronaves novas → 3b Hubs (conexões, base, pernoite, hubs adicionais) → 3c Financiamento → 4 Base internacional → 5 Cargas → 6 Eventos e objetivos → 7 Balanceamento.

### Perguntas originais

1. **Estrutura:** modelo principal na fundação e divisões depois? (recomendado)
2. **Trocar de modelo principal durante o jogo:** recomendo **não** na primeira versão, porque simplifica e torna a escolha importante. Alternativa: permitir uma vez, com custo e perda de reputação.
3. **Pequeno porte como "começar de baixo" que evolui para o regional** (recomendado), ou um nicho fechado que nunca passa de aviões pequenos?
4. **Ampliar o mapa com cerca de 8 aeroportos pequenos e 8 internacionais?** Os dados (coordenadas, porte, pista) seriam conferidos e listados para você antes.
5. **Dados das aeronaves novas:** confiro em fontes públicas e mostro a tabela antes de colocar no jogo?
