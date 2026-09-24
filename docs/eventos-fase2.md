# Eventos novos da Fase 2 — rascunho para revisão

18 eventos novos, que somados aos 12 atuais chegam a 30. Pode editar este arquivo direto: rótulos, textos e desfechos. Os efeitos também podem mudar.

Convenções (as mesmas da seção 9 do CLAUDE.md):
- `escala` = número de aeronaves (mínimo 1). "−80 mil·escala" custa R$ 80 mil por avião.
- "Frota ±N" soma N pontos de condição a todos os aviões fora de manutenção.
- Modificadores: `demand`, `share`, `fuel`, `salary`, `wear` (desgaste) e `halt` (malha parada).
- Prévia no canhoto: ▲/▼ de caixa, reputação, frota e operação.

---

## Sazonais

Só podem sair dentro da janela do calendário e têm prioridade sobre os outros nesse período. Saem no máximo uma vez por ano.

### 1. carnaval — Carnaval chegando
**Janela:** 4 a 17 de fevereiro
**Texto:** Salvador, Recife e Rio lotaram. As buscas por voos triplicaram nesta semana.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Reforçar a malha | Tarifa de alta temporada |
| Prévia | caixa ▲, frota ▼ | caixa ▲, reputação ▼ |
| Efeito | demand ×1,3 por 7 dias; frota −4 | +180 mil·escala; reputação −2 |
| Desfecho | Aviões cheios de confete. Demanda +30% por 7 dias. | Receita extra de R$ X. Reclamações de preço nas redes. |

### 2. ferias — Férias de julho
**Janela:** 24 de junho a 14 de julho
**Texto:** Escolas em férias e famílias no balcão. As crianças desacompanhadas dobraram.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Programa Criança a Bordo | Só vender assentos |
| Prévia | caixa ▼, reputação ▲ | caixa ▲ |
| Efeito | −60 mil·escala; reputação +4; demand ×1,1 por 20 dias | demand ×1,2 por 15 dias |
| Desfecho | Pais elogiam o cuidado da tripulação. Custo: R$ X. | Demanda +20% por 15 dias. |

### 3. fimdeano — Fim de ano
**Janela:** 26 de novembro a 21 de dezembro
**Texto:** Dezembro chegou. Aeroportos cheios e bagagem extraviada no noticiário.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Contratar temporários | Operar com a equipe atual |
| Prévia | caixa ▼, reputação ▲ | frota ▼, reputação ▼ |
| Efeito | −100 mil·escala; reputação +3; demand ×1,25 por 15 dias | demand ×1,25 por 15 dias; frota −6; 40% de chance de reputação −6 |
| Desfecho | Balcões rápidos e malas no destino. Custo: R$ X. | *(com azar)* Malas extraviadas viraram notícia. Reputação −6. *(sem azar)* A equipe segurou o tranco. Demanda +25% por 15 dias. |

---

## Cadeias

Cada evento abaixo só pode sair **depois** de uma escolha específica num evento anterior, respeitando o intervalo mínimo indicado. Os eventos de origem só ganham uma marca no estado; o efeito deles não muda.

### 4. sindicato — Sindicato volta à mesa
**Libera:** 60 dias depois de escolher "Endurecer" na Greve de pilotos
**Texto:** Os pilotos não esqueceram a greve. Querem um acordo de dois anos antes da próxima data-base.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Assinar o acordo | Adiar de novo |
| Prévia | caixa ▼ | operação ▼, reputação ▼ |
| Efeito | salary ×1,08 por 365 dias; a Greve de pilotos não sai por 1 ano | 50% de chance: halt 5 dias e reputação −8 |
| Desfecho | Acordo assinado. Salários +8% por um ano e paz na cabine. | *(com azar)* Nova paralisação: cinco dias sem voar. *(sem azar)* O sindicato recuou. Por enquanto. |

### 5. clubefinal — Seu clube na final
**Libera:** 30 dias depois de "Fechar contrato" na Proposta de patrocínio
**Texto:** O time que leva sua marca chegou à final. A torcida quer viajar junto.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Fretar voos da torcida | Deixar passar |
| Prévia | caixa ▲, reputação ▲ | sem impacto |
| Efeito | +250 mil·escala; reputação +4 | nada |
| Desfecho | Arquibancada no ar. Receita de R$ X e festa na chegada. | Os fretamentos ficaram com a concorrência. |

### 6. clubeescandalo — Escândalo no clube
**Libera:** 45 dias depois de "Fechar contrato" na Proposta de patrocínio
**Texto:** O presidente do clube que você patrocina foi preso. Sua marca está na camisa.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Romper o contrato | Manter o patrocínio |
| Prévia | caixa ▼, reputação ▲ | reputação ▼ |
| Efeito | −150 mil·escala (multa); reputação +2 | reputação −8 |
| Desfecho | Contrato rompido. Multa de R$ X, marca preservada. | Sua marca apareceu em todas as manchetes. Reputação −8. |

### 7. hedge — Hedge vence
**Libera:** 40 dias depois de "Travar preço (hedge)" em Querosene dispara
**Texto:** O banco oferece renovar a trava do querosene por mais 60 dias.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Renovar a trava | Voltar ao mercado |
| Prévia | caixa ▼ | sem impacto |
| Efeito | −200 mil·escala; fuel ×0,92 por 60 dias | nada |
| Desfecho | Trava renovada por R$ X. Combustível 8% abaixo do mercado. | Você volta a pagar o preço do dia. |

### 8. anacvolta — A ANAC voltou
**Libera:** 30 dias depois de "Pedir prazo" na Fiscalização da ANAC
**Texto:** Os inspetores voltaram para conferir as pendências do prazo que você pediu.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Abrir todos os registros | Pedir mais prazo |
| Prévia | caixa ▼, frota ▲ | caixa ▼, operação ▼ |
| Efeito | −150 mil·escala; frota +5 | 60% de chance: multa de 600 mil·escala e halt 2 dias |
| Desfecho | Pendências resolvidas (R$ X). Frota +5% de condição. | *(com azar)* Multa de R$ X e dois dias de frota retida. *(sem azar)* Os inspetores aceitaram. Desta vez. |

### 9. procon — Ação coletiva
**Libera:** 40 dias depois de "Ignorar" no Vídeo viral
**Texto:** Passageiros entraram na Justiça por causa da poltrona quebrada. O Procon quer uma posição.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Fazer acordo | Ir até o fim |
| Prévia | caixa ▼, reputação ▲ | caixa ▼, reputação ▼ |
| Efeito | −200 mil·escala; reputação +3 | 50% de chance: −500 mil·escala e reputação −5 |
| Desfecho | Acordo fechado por R$ X. O caso saiu do noticiário. | *(com azar)* Derrota na Justiça: R$ X e reputação −5. *(sem azar)* O juiz deu ganho de causa à companhia. |

---

## Avulsos

### 10. turbulencia — Turbulência severa
**Texto:** Um voo pegou turbulência forte. Dois comissários feridos, nenhum passageiro.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Revisar o procedimento | Soltar nota à imprensa |
| Prévia | caixa ▼, reputação ▲ | reputação ▼ |
| Efeito | −70 mil·escala; reputação +2 | reputação −3 |
| Desfecho | Treinamento refeito (R$ X). Tripulação agradece. | A nota soou fria. Reputação −3. |

### 11. app — Aplicativo novo
**Texto:** Uma agência propõe um app de reservas com check-in pelo celular.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Investir no app | Manter o site |
| Prévia | caixa ▼, operação ▲ | sem impacto |
| Efeito | −400 mil·escala; share ×1,06 por 180 dias | nada |
| Desfecho | App no ar por R$ X. Atratividade +6% por 180 dias. | O site continua como está. |

### 12. obras — Obras na pista
**Condição:** hub doméstico
**Texto:** O aeroporto do seu hub vai fechar uma pista por 20 dias para recapeamento.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Reduzir voos | Pagar por horários noturnos |
| Prévia | operação ▼ | caixa ▼ |
| Efeito | demand ×0,85 por 20 dias | −150 mil·escala |
| Desfecho | Malha enxuta: demanda −15% por 20 dias. | Voos remanejados para a madrugada por R$ X. |

### 13. aeroportuarios — Greve nos aeroportos
**Texto:** Bombeiros e operadores de pátio cruzam os braços amanhã. Seus pilotos não têm nada com isso.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Esperar em solo | Desviar para outros aeroportos |
| Prévia | operação ▼ | caixa ▼, reputação ▼ |
| Efeito | halt 2 dias | −120 mil·escala; reputação −2 |
| Desfecho | Dois dias de aviões parados no pátio. | Voos desviados por R$ X. Passageiros chegaram de ônibus. |

### 14. recall — Alerta do fabricante
**Condição:** ter ao menos um jato
**Texto:** O fabricante pede inspeção num lote de motores. Alguns dos seus aviões podem estar nele.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Inspecionar já | Esperar o próximo check |
| Prévia | caixa ▼, frota ▲ | frota ▼ |
| Efeito | −100 mil·escala; frota +5 | wear ×1,3 por 60 dias |
| Desfecho | Motores inspecionados (R$ X). Frota +5% de condição. | Desgaste 30% maior pelos próximos 60 dias. |

### 15. talento — Piloto-chefe assediado
**Texto:** A Horizonte quer levar seu piloto-chefe e metade dos instrutores.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Cobrir a oferta | Deixar ir |
| Prévia | caixa ▼ | frota ▼, reputação ▼ |
| Efeito | salary ×1,04 por 180 dias | wear ×1,15 por 90 dias; reputação −2 |
| Desfecho | Equipe mantida. Salários +4% por 180 dias. | Sem os instrutores, a frota sofre: desgaste +15% por 90 dias. |

### 16. dolar — Dólar dispara
**Texto:** O real perdeu 12% em uma semana. Combustível e peças são cotados em dólar.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Travar o câmbio | Correr o risco |
| Prévia | caixa ▼ | caixa ▼ |
| Efeito | −200 mil·escala | fuel ×1,12 por 30 dias |
| Desfecho | Câmbio travado por R$ X. | Combustível 12% mais caro por 30 dias. |

### 17. aerovia — Aerovia chega ao hub
**Condição:** hub doméstico
**Texto:** A Aerovia vai abrir voos no seu hub com tarifas promocionais.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Lançar programa de fidelidade | Não reagir |
| Prévia | caixa ▼, operação ▲ | operação ▼ |
| Efeito | −250 mil·escala; share ×1,05 por 120 dias | share ×0,85 por 45 dias |
| Desfecho | Fidelidade no ar por R$ X. Clientes mais fiéis por 120 dias. | A promoção levou parte dos seus passageiros por 45 dias. |

### 18. enchente — Enchente no Sul
**Texto:** Chuvas isolaram cidades gaúchas. A Defesa Civil pede aviões para levar doações.

| | Esquerda | Direita |
|---|---|---|
| Rótulo | Ceder aviões | Doar em dinheiro |
| Prévia | reputação ▲, operação ▼ | caixa ▼, reputação ▲ |
| Efeito | demand ×0,9 por 5 dias; reputação +6 | −100 mil·escala; reputação +2 |
| Desfecho | Toneladas de doações entregues. O país agradece. | Doação de R$ X entregue à Defesa Civil. |

---

## Novidades de mecânica que esses eventos pedem

1. **Janela sazonal:** o evento só é elegível entre duas datas do ano e sai no máximo uma vez por ano.
2. **Cadeias:** um campo `flags` no estado guarda o dia em que certas escolhas foram feitas. O evento seguinte exige a marca e um intervalo mínimo. O save sobe para v4.
3. **Modificador `wear`**, que já existia no tipo, passa a ser usado (recall e talento).
4. **Bloqueio temporário:** o acordo do sindicato impede a Greve de pilotos por 1 ano.
5. **Desfechos com sorteio:** vários eventos mostram um texto diferente conforme o sorteio.
