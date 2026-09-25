# Fase 4, etapa 5 — Idade dos aviões, mercado de usados, carga no porão e expansão

Aprovada em 2026-09-24 (sem efeito da idade na reputação) e implementada. Os números marcados como **ajustável** são calibrados no rebalanceamento final da Fase 4.

## 1. Idade dos aviões

Cada avião passa a ter um **ano de fabricação**. Avião novo sai com idade 0; nos saves antigos, a idade conta a partir do dia em que o avião entrou na frota.

| Efeito                 | Regra                                                                   | Exemplo com 10 anos            |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| Manutenção mais cara   | +4% por ano de idade (**ajustável**)                                    | +40%                           |
| Desgaste mais rápido   | +2% por ano de idade (**ajustável**)                                    | a condição cai 20% mais rápido |
| Valor de revenda menor | −5% por ano, composto, até o piso de 25% do valor atual (**ajustável**) | 60% do valor de um avião novo  |

- **Interface:** a idade aparece na Frota ("8 anos"). Arrendados também envelhecem, mas quem paga a revenda é o arrendador; para o jogador, o que pesa neles é a manutenção e o desgaste.
- **Por que importa:** sem idade, um avião comprado no dia 1 vale para sempre. Com idade, renovar a frota vira uma decisão: manter o avião velho e pagar mais manutenção, ou vender e trocar.

## 2. Mercado de usados

- **Oferta:** Mercado → Aeronaves ganha a opção **Novos | Usados**. A cada 30 dias chega uma lista nova com 5 aviões usados sorteados:
  - modelos que o jogador pode operar;
  - de 4 a 20 anos;
  - condição de 55% a 90%.
- **Preço:** preço do novo × 0,95^idade × fator de condição (**ajustável**). Um A320neo de 10 anos com 75% de condição sai por cerca de 50% do preço do novo.
- **Leasing de usado:** o leasing do novo × (1 − 3% por ano de idade), com piso de 50% (**ajustável**). O depósito é o mesmo de hoje (10 dias).
- **Financiamento:** vale também para usados, com prazo de 3 ou 5 anos. O de 8 anos fica só para aviões novos.
- **Troca:** cada oferta sai da lista quando é comprada ou arrendada.
- **Por que importa:** é o caminho barato para começar ou crescer rápido, pagando em manutenção e desgaste. O caso real do 767-300F de R$ 12 mi ganha contexto: ele passa a ser um usado de 20 anos.

## 3. Carga no porão (divisão Cargas)

- **Capacidade:** com a divisão aberta, as rotas de **passageiros** levam carga no porão, sem avião extra. Capacidade por voo, por sentido:

  | Avião         | Capacidade |
  | ------------- | ---------- |
  | Turboélice    | 0,3 t      |
  | Jato regional | 0,8 t      |
  | Narrowbody    | 1,5 t      |
  | Widebody      | 8 t        |
  | Pequeno porte | 0,1 t      |

- **Demanda:** a demanda de carga do par × a participação de mercado da rota de passageiros × 50% (o resto vai em cargueiros e na concorrência).
- **Receita e custo:** receita pelo frete de referência × 80% (porão é mais barato que cargueiro), com a mesma taxa de manuseio por tonelada.
- **Onde aparece:** a receita entra na linha "Receita de carga" de Finanças; as toneladas entram no total do dia e no objetivo "Cem toneladas". O porão **não** conta para a capacidade exigida pelos contratos, que continuam exigindo cargueiro.

## 4. Revisão da expansão (fim de jogo)

Depois de implementar os três itens acima, rodo a simulação de novo. A idade e os usados mudam a economia da frota, e o porão soma receita para quem já é grande. Então ajusto o fim de jogo com alavancas que já existem, sem regra nova:

- custo das licenças Nacional e Internacional;
- leasing dos jatos e widebodies;
- teto do bônus de conexão.

**Meta proposta:**

- **Expansão no dia 600:** no máximo 2× a estratégia esperta. Hoje está em 2,8× em GRU.
- **Modelos:** Low-cost e Regional seguem a até ±25% do Tradicional.
- **Cargas:** a divisão continua rendendo de +5% a +25%.

## 5. Save

Sobe para a versão 11:

- o avião ganha o dia de fabricação;
- o estado ganha a lista de usados e a data da próxima lista.

A migração dá aos aviões existentes a idade contada a partir do dia em que entraram na frota.

## 6. Calibração no rebalanceamento final (2026-09-25)

Diagnóstico com a simulação:

- **Expansão:** chegava a 3,2× a esperta em GRU no dia 600.
- **Divisão Cargas:** somava +35% a +47% no dia 1.000.

O motor principal eram os **cargueiros**, não o porão. Os convertidos (737-800BCF e 767-300F) saíam como novos e com leasing muito barato: o 767F rendia R$ 482 mil/dia em GRU–Miami.

| Mudança                                | Antes                                    | Depois                                               | Por quê                                                                                              |
| -------------------------------------- | ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Idade na entrega dos convertidos       | 0                                        | 737-800BCF 15 anos, 767-300F 20 anos (`deliveryAge`) | São aviões de passageiros antigos convertidos; com a idade valendo, pagam mais manutenção e desgaste |
| Ocupação máxima do cargueiro           | 100%                                     | 75% (`CARGO_MAX_LF`)                                 | A carga tem sentido dominante: o avião volta parcialmente vazio                                      |
| Leasing dos cargueiros a jato          | R$ 24,7 mil e R$ 14,8 mil                | R$ 32,1 mil e R$ 19,2 mil                            | Os +30% dos jatos da Fase 2 não tinham sido aplicados a eles                                         |
| Escala da demanda de carga             | 0,3                                      | 0,2                                                  | Menos toneladas por par; os cargueiros deixam de render o dobro de um avião de passageiros           |
| Porão                                  | 50% da demanda de carga do par           | 20%                                                  | Soma receita sem avião extra; precisa ser um complemento                                             |
| Tarifa de referência acima de 1.500 km | R$ 0,30/km até 3.500 e R$ 0,20/km depois | R$ 0,22 e R$ 0,12                                    | Só afeta rotas longas, que só os jatos voam; freia o fim de jogo sem mexer no começo                 |

Resultado (3 sementes):

- **Expansão no dia 600:** 1,2× a esperta em BSB e 2,1× em GRU. A meta era até 2×.
- **Divisão Cargas no dia 1.000:** +14% em BSB e +17% em GRU. A meta era de +5% a +25%.
