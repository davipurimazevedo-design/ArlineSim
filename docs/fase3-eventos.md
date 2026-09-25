# Eventos e objetivos da Fase 3 — rascunho para revisão

Rascunho de 2026-09-24. Nada disto está implementado. Pode editar este arquivo direto: rótulos, textos, desfechos e efeitos.

São 20 eventos novos (4 por modelo de negócio e 4 por divisão) e 16 objetivos novos. Cada evento **só pode sair** para quem tem aquele modelo ou divisão, então nenhuma companhia vê todos. Seguem a mesma regra de hoje: aleatórios, com intervalo entre eventos e sem repetir o mesmo evento em pouco tempo.

Convenções (as mesmas da Fase 2):
- `escala` = número de aeronaves (mínimo 1). "−80 mil·escala" custa R$ 80 mil por avião.
- "Frota ±N" soma N pontos de condição a todos os aviões fora de manutenção.
- Modificadores: `demand`, `share`, `fuel`, `salary`, `wear` (desgaste), `halt` (malha parada) e `fare` (tarifa cobrada).
- **Modificador novo `cargo`:** multiplica só a demanda das rotas de carga.
- Prévia no canhoto: ▲/▼ de caixa, reputação, frota e operação.

---

## Low-cost

### 1. bagagem — Procon questiona a taxa de bagagem
**Texto:** O Procon abriu processo contra a cobrança de mala despachada. A imprensa quer saber se você recua.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Manter a taxa | Liberar uma mala |
| Prévia | caixa ▲, reputação ▼ | caixa ▼, reputação ▲ |
| Efeito | +40 mil·escala; reputação −3 | −30 mil·escala; reputação +2; demand ×1,1 por 20 dias |
| Desfecho | A taxa fica. Receita de R$ X e manchetes azedas. | Mala grátis por um mês. Demanda +10% por 20 dias. |

### 2. guerratarifa — Guerra de tarifas
**Texto:** A Aerovia anunciou passagens a partir de R$ 99 nas rotas que vocês disputam.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Cobrir o preço | Não entrar na briga |
| Prévia | caixa ▼, operação ▲ | operação ▼ |
| Efeito | fare ×0,85 e share ×1,2 por 30 dias | share ×0,85 por 30 dias |
| Desfecho | Tarifas 15% menores e aviões cheios por 30 dias. | A Aerovia leva parte dos seus passageiros por 30 dias. |

### 3. assento — Vídeo do assento apertado
**Texto:** Um passageiro de 1,95 m filmou os joelhos no encosto da frente. São 4 milhões de visualizações.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Pedir desculpas e dar voucher | Defender o preço baixo |
| Prévia | caixa ▼, reputação ▲ | reputação ▼, operação ▲ |
| Efeito | −50 mil·escala; reputação +2 | reputação −4; demand ×1,05 por 20 dias |
| Desfecho | Voucher entregue e desculpas aceitas. Custo: R$ X. | "É o preço de voar barato." Metade da internet concordou. Demanda +5%. |

### 4. secundario — Aeroporto secundário quer você
**Texto:** A concessionária de {cidade} oferece slots de graça para uma low-cost que traga voos.
**Requer:** um aeroporto doméstico de porte 3 a 6 sem slot seu.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Aceitar os slots | Recusar |
| Prévia | operação ▲ | sem impacto |
| Efeito | slot grátis em {cidade} | nada |
| Desfecho | Slots em {cidade} garantidos, sem custo. | A concessionária foi atrás da Aerovia. |

---

## Regional

### 5. prefeitura — Prefeito quer voo
**Texto:** O prefeito de {cidade} promete divulgação e isenção de taxas se você colocar a cidade no mapa.
**Requer:** um aeroporto doméstico de porte 2 a 5 sem slot seu.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Aceitar a parceria | Agradecer e recusar |
| Prévia | operação ▲, reputação ▲ | reputação ▼ |
| Efeito | slot grátis em {cidade}; reputação +2 | reputação −1 |
| Desfecho | Faixa na praça e slots em {cidade} sem custo. | O prefeito reclamou na rádio local. |

### 6. pecas — Falta peça de turboélice
**Texto:** A fábrica atrasou hélices e peças de motor. Três aviões podem ficar no chão.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Comprar de terceiros | Canibalizar um avião |
| Prévia | caixa ▼ | frota ▼ |
| Efeito | −60 mil·escala | frota −8 |
| Desfecho | Peças de outra operadora, a preço de ouro. Custo: R$ X. | Peças tiradas de um avião para manter os outros voando. Frota −8. |

### 7. subsidio — Programa de aviação regional
**Texto:** O governo lançou um programa que paga parte do custo de rotas para cidades médias.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Aderir | Ficar de fora |
| Prévia | caixa ▲, reputação ▲ | sem impacto |
| Efeito | +80 mil·escala; reputação +2; demand ×0,95 por 60 dias (tarifa tabelada) | nada |
| Desfecho | Subsídio de R$ X. Em troca, tarifa tabelada: demanda −5% por 60 dias. | Sem papelada e sem subsídio. |

### 8. neblina — Neblina no interior
**Texto:** Uma semana de neblina fechou aeroportos sem ILS no interior. Os voos das cidades pequenas estão atrasando.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Cancelar quando fechar | Esperar a janela |
| Prévia | operação ▼, reputação ▲ | frota ▼, reputação ▼ |
| Efeito | demand ×0,85 por 7 dias; reputação +1 | 35% de chance: frota −10 e reputação −5 |
| Desfecho | Cancelamentos avisados com antecedência. Demanda −15% por 7 dias. | *(com azar)* Arremetidas e atrasos em cascata. *(sem azar)* A neblina abriu a tempo. |

---

## Pequeno porte

### 9. pistaalagada — Pista alagada
**Texto:** A chuva transformou a pista de terra de uma das suas cidades em lama.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Suspender os voos | Operar com cuidado |
| Prévia | operação ▼, reputação ▲ | frota ▼, reputação ▼ |
| Efeito | halt 2 dias; reputação +1 | 30% de chance: frota −15 e reputação −5 |
| Desfecho | Dois dias sem voar até a pista secar. | *(com azar)* Um avião atolou e danificou o trem de pouso. *(sem azar)* Pousos na lama, sem incidentes. |

### 10. garimpo — Fretamento para o garimpo
**Texto:** Um empresário oferece pagar em dinheiro vivo por voos semanais para uma pista clandestina.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Aceitar | Recusar |
| Prévia | caixa ▲, reputação ▼ | reputação ▲ |
| Efeito | +150 mil·escala; reputação −6; 25% de chance de multa de 300 mil·escala | reputação +2 |
| Desfecho | *(com azar)* A Polícia Federal apreendeu o avião por um dia. Multa de R$ X. *(sem azar)* Dinheiro no caixa e má fama na região. | Você recusou. A notícia correu e a cidade gostou. |

### 11. uti — Remoção médica urgente
**Texto:** Um paciente grave precisa sair de uma cidade isolada hoje. A prefeitura pede o seu avião.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Atender | Não atender |
| Prévia | caixa ▼, reputação ▲ | reputação ▼ |
| Efeito | −15 mil·escala; reputação +5 | reputação −3 |
| Desfecho | O paciente chegou a tempo. A cidade não vai esquecer. | A família procurou outra empresa. A história se espalhou. |

### 12. parintins — Festival de Parintins
**Janela:** 15 a 30 de junho
**Texto:** O boi-bumbá vai lotar a ilha. Não há estrada até lá.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Voos extras | Tarifa de festival |
| Prévia | operação ▲, frota ▼ | caixa ▲, reputação ▼ |
| Efeito | demand ×1,4 por 7 dias; frota −4 | +50 mil·escala; reputação −2 |
| Desfecho | Aviões lotados de torcedores de Garantido e Caprichoso. Demanda +40%. | Receita extra de R$ X e reclamações do preço. |

---

## Divisão Cargas

### 13. blackfriday — Black Friday
**Janela:** 15 a 30 de novembro
**Texto:** O comércio eletrônico prevê o dobro de encomendas. Os centros de distribuição pedem espaço nos seus cargueiros.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Voos extras de carga | Frete de pico |
| Prévia | operação ▲, frota ▼ | caixa ▲ |
| Efeito | cargo ×1,5 por 10 dias; frota −4 | +60 mil·escala |
| Desfecho | Porões cheios de caixas. Demanda de carga +50% por 10 dias. | Frete de pico cobrado. Receita extra de R$ X. |

### 14. apreensao — Receita Federal retém carga
**Texto:** A fiscalização reteve um lote no seu terminal por suspeita de nota fria de um cliente.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Cooperar e esperar | Contestar na Justiça |
| Prévia | operação ▼ | caixa ▼ |
| Efeito | cargo ×0,7 por 10 dias | −40 mil·escala; 40% de chance de reputação −4 |
| Desfecho | Terminal sob fiscalização. Demanda de carga −30% por 10 dias. | *(com azar)* O juiz negou e o caso virou notícia. *(sem azar)* Liminar concedida. Custo: R$ X. |

### 15. safra — Safra recorde
**Texto:** Frutas, peixe e flores em volume recorde. Exportadores querem mandar tudo antes de estragar.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Priorizar perecíveis | Manter a programação |
| Prévia | operação ▲, frota ▼ | sem impacto |
| Efeito | cargo ×1,3 por 30 dias; frota −3 | nada |
| Desfecho | Cargueiros refrigerados rodando dia e noite. Demanda de carga +30% por 30 dias. | Os exportadores foram para a Rota Norte Cargo. |

### 16. perigosa — Carga perigosa mal declarada
**Texto:** O raio-X mostrou baterias de lítio num lote declarado como roupas. O cliente jura que é engano.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Recusar o lote | Embarcar assim mesmo |
| Prévia | caixa ▼, reputação ▲ | caixa ▲, frota ▼ |
| Efeito | −20 mil·escala; reputação +1 | +40 mil·escala; 20% de chance: frota −12 e reputação −8 |
| Desfecho | Lote devolvido. O cliente pagou a multa, você a armazenagem. | *(com azar)* Princípio de incêndio no porão, pouso de emergência. *(sem azar)* Chegou sem incidentes. Desta vez. |

---

## Divisão Base internacional

### 17. cambio — Câmbio dispara
**Texto:** O dólar subiu 8% em uma semana. Leasing, taxas e hubs no exterior ficam mais caros.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Contratar hedge cambial | Absorver a alta |
| Prévia | caixa ▼ | caixa ▼ |
| Efeito | −100 mil·escala; câmbio +3% | câmbio +12% |
| Desfecho | Hedge contratado por R$ X. O impacto ficou em 3%. | Dólar 12% mais caro. Custos no exterior sobem junto. |

### 18. realforte — Real se valoriza
**Texto:** Boas notícias na economia: o dólar caiu. Viajar para fora ficou mais barato para o brasileiro.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Campanha "Conheça o mundo" | Guardar a folga no caixa |
| Prévia | caixa ▼, operação ▲ | caixa ▲ |
| Efeito | câmbio −8%; −40 mil·escala; demand ×1,1 por 30 dias | câmbio −8%; +30 mil·escala |
| Desfecho | Campanha no ar. Demanda +10% por 30 dias. | Custos no exterior menores e R$ X a mais no caixa. |

### 19. codeshare — Atlântica quer rever o acordo
**Requer:** codeshare ativo.
**Texto:** A Atlântica diz que o codeshare favorece você e pede uma compensação.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Pagar a compensação | Encerrar o acordo |
| Prévia | caixa ▼ | operação ▼ |
| Efeito | −10 mil·escala × 10 | codeshare encerrado |
| Desfecho | Acordo mantido por mais um tempo. Custo: R$ X. | Fim do codeshare. A Atlântica volta a disputar tudo. |

### 20. visto — Regras de visto mais duras
**Texto:** Um país da sua malha endureceu a entrada de brasileiros. Passageiros estão sendo barrados no embarque.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Montar um balcão de apoio | Deixar com o passageiro |
| Prévia | caixa ▼, reputação ▲ | reputação ▼, operação ▼ |
| Efeito | −30 mil·escala; reputação +3 | reputação −3; demand ×0,95 por 30 dias |
| Desfecho | Orientação no check-in e menos barrados. Custo: R$ X. | Filas, choro no portão e demanda −5% por 30 dias. |

---

## Objetivos novos

Aparecem só para o modelo ou a divisão indicada. Recompensa em reputação, como os atuais (nunca dinheiro).

| Para | Objetivo | Condição | Reputação |
|---|---|---|---|
| Low-cost | **Avião cheio** | ocupação média ≥ 90% com 5 rotas voando | +2 |
| Low-cost | **Tarifa de ônibus** | 8 rotas voando, todas com tarifa abaixo da referência | +2 |
| Low-cost | **Multidão** | 3.000 passageiros num só dia | +3 |
| Regional | **Interior conectado** | 10 aeroportos de porte ≤ 6 atendidos por rotas com avião | +3 |
| Regional | **Capilaridade** | slots em 20 aeroportos | +2 |
| Regional | **Jato regional** | operar um E195-E2 ou E175 | +1 |
| Pequeno porte | **Pouso na terra** | rota com avião num aeroporto de pista não pavimentada | +1 |
| Pequeno porte | **Amazônia no mapa** | 5 cidades de porte ≤ 2 atendidas | +2 |
| Pequeno porte | **Gente grande** | obter a certificação regional | +3 |
| Pequeno porte | **Primeiro ATR** | ter um ATR 42 ou ATR 72 na frota | +1 |
| Cargas | **Primeira carga** | uma rota de carga com cargueiro | +1 |
| Cargas | **Cem toneladas** | 100 t de carga num só dia | +2 |
| Cargas | **Cliente fiel** | cumprir um contrato até o fim | +2 |
| Base internacional | **Bandeira lá fora** | um hub no exterior | +2 |
| Base internacional | **Parceria global** | assinar o codeshare | +1 |
| Base internacional | **Três continentes** | rotas para a América do Sul, a América do Norte e a Europa | +3 |

Com isso, o Tradicional continua com os 18 objetivos atuais, e cada outra escolha ganha de 3 a 4 objetivos próprios.
