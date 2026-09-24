# Fase 3 — Aeronaves novas: dados reais e conversão para o jogo

Levantamento de 2026-09-24, para aprovação antes de entrar no jogo.

## 1. Método de conversão

Os valores do jogo não são os reais em reais: o protótipo usa uma escala própria. Para as aeronaves novas ficarem coerentes com as atuais, usei o **ATR 72-600 como âncora**, porque ele não mudou no balanceamento da Fase 2 e tem dados públicos confiáveis:

| Grandeza | ATR 72-600 real | ATR 72-600 no jogo | Fator |
|---|---|---|---|
| Valor de mercado | US$ 22,5 mi (Ascend, meados de 2024) | R$ 55 mi | **2,44 R$ por US$** |
| Leasing | ~US$ 170 mil por mês | R$ 28 mil por dia | **5,0 R$/dia por US$/dia** |
| Combustível | 879 kg em 300 nm (556 km), ficha oficial da ATR | R$ 7/km | **R$ 4,43 por kg** |

**Prova:** o A320neo real (US$ 55 mi de valor, US$ 400 mil por mês de leasing, IBA set/2024) sai por R$ 134 mi e R$ 66 mil por dia com esses fatores. O protótipo usava R$ 145 mi e R$ 68 mil, então o método reproduz a escala original.

Custos de tripulação, desgaste e utilização diária não têm fonte pública única. Estimei cada um em relação às aeronaves atuais: menos tripulantes custam menos, e cargueiros não têm comissários e voam de madrugada. Esses valores estão marcados como **estimativa** e podem mudar no balanceamento.

## 2. Pequeno porte (licença Táxi aéreo)

| | Cessna 208B Grand Caravan EX | Pilatus PC-12 NGX | DHC-6 Twin Otter Classic 300-G |
|---|---|---|---|
| Tipo | Monomotor turboélice, pista curta | Monomotor turboélice pressurizado | Bimotor turboélice, pista curta (STOL) |
| Passageiros | **10 a 14 ocupantes**; no jogo, **12** | **até 9** | **19** |
| Velocidade de cruzeiro | **185 ktas (343 km/h)** | **290 ktas (537 km/h)** | **170 kt (315 km/h)** |
| Alcance máximo | **912 nm (1.689 km)** | **1.765 nm (3.269 km)** | **714 nm (1.322 km)**, com 2.270 lb de carga |
| Consumo | **553 kg em 500 nm** (brochura) → 0,60 kg/km | ~55–66 gal/h → ~0,37 kg/km (fontes de mercado) | ~0,9 kg/km (**estimativa**, dois PT6A-27) |
| Preço real | **US$ 2,6 mi** (preço de lista, 2º tri/2024) | ~**US$ 6,0 mi** equipado (2023) | ~**US$ 7,5 mi** (referência da Série 400; o 300-G não tem preço público) |
| **No jogo: preço** | R$ 6,4 mi | R$ 14,7 mi | R$ 18,3 mi |
| **No jogo: leasing/dia** | R$ 4,3 mil (*) | R$ 9,9 mil (*) | R$ 12,3 mil (*) |
| **No jogo: combustível/km** | R$ 2,70 | R$ 1,65 | R$ 3,90 |
| **No jogo: tripulação/h** | R$ 600 (1 piloto, **estimativa**) | R$ 650 (**estimativa**) | R$ 900 (2 pilotos, **estimativa**) |
| **No jogo: utilização máx.** | 10 h/dia | 11 h/dia | 11 h/dia |

(*) Não achei leasing público para esses modelos. Usei a regra de mercado de ~1% do valor por mês. Marcado como estimativa.

## 3. Cargueiros (divisão Cargas)

| | ATR 72-600F | Boeing 737-800BCF | Boeing 767-300F / 767-300BCF |
|---|---|---|---|
| Tipo | Cargueiro regional de fábrica | Conversão de passageiro | Widebody |
| Carga máxima | **9,2 t** (ficha oficial da ATR) | **24 t** (Boeing) | **57 t** (Boeing) |
| Alcance com carga máxima | **1.908 km** (1.030 nm) | **3.700 km** (2.000 nm) | **6.110 km** (3.300 nm) |
| Volume | 75 m³ | ~141 m³ | ~438 m³ |
| Velocidade de cruzeiro | 510 km/h (como o ATR 72-600) | ~840 km/h | ~850 km/h |
| Consumo | igual ao ATR 72-600 (1,58 kg/km) | ~3,0 kg/km (**estimativa**) | ~6,4 kg/km (**estimativa**) |
| Valor e leasing reais | não publicados; **estimativa** de US$ 24 mi e US$ 180 mil/mês | leasing **US$ 140–160 mil/mês** (IBA, 2º sem/2024) | um 767-300ERBDSF de 21 anos: **US$ 5 mi** e **~US$ 90 mil/mês** (IBA, jul/2024) |
| **No jogo: preço** | R$ 59 mi | R$ 37 mi (valor estimado de US$ 15 mi) | R$ 12 mi (convertido e antigo) |
| **No jogo: leasing/dia** | R$ 29,6 mil | R$ 24,7 mil | R$ 14,8 mil |
| **No jogo: combustível/km** | R$ 7 | R$ 13,30 | R$ 28 |
| **No jogo: tripulação/h** | R$ 1.200 (**estimativa**) | R$ 2.600 (**estimativa**) | R$ 5.000 (**estimativa**) |
| **No jogo: utilização máx.** | 14 h/dia | 15 h/dia | 16 h/dia |

**Atenção ao 767:** os dados reais de mercado são de aviões convertidos com cerca de 20 anos, que custam pouco para comprar e arrendar, mas têm manutenção cara. No jogo, isso vira desgaste por hora maior (**estimativa**: 0,09%/h, contra 0,05% do A330). Sem esse ajuste, ele seria barato demais para 57 t de carga. O 767 novo de fábrica custa muito mais e não tem valor de mercado público confiável.

## 4. Fontes

- Cessna, brochura oficial do Grand Caravan EX (especificações e tabela de combustível por missão): https://cessna.txtav.com/-/media/cessna/files/brochures/turboprop/grand_caravan_ex_brochure.pdf
- Preço do Grand Caravan EX (AvBuyer, guia de preços): https://www.avbuyer.com/articles/turboprop-price-guides/cessna-grand-caravan-ex-price-guide-113201
- Pilatus, página oficial do PC-12: https://www.pilatus-aircraft.com/en/fly/pc-12
- Preço e consumo do PC-12 NGX: https://en.wikipedia.org/wiki/Pilatus_PC-12 e https://www.aircraftcostcalculator.com/AircraftOperatingCosts/256/Pilatus+PC-12+NG
- De Havilland Canada, Twin Otter Classic 300-G: https://dehavilland.com/twin-otter-classic-300-g/
- Preço de referência do Twin Otter: https://en.wikipedia.org/wiki/De_Havilland_Canada_DHC-6_Twin_Otter
- ATR 72-600F, página oficial: https://www.atr-aircraft.com/regional-mobility/regional-aircraft/atr-72-600f-freighter/
- ATR 72-600, ficha oficial (consumo em 300 nm): https://www.atr-aircraft.com/wp-content/uploads/2022/06/ATR_Fiche72-600-3.pdf
- Boeing, família de cargueiros (737-800BCF e 767-300F): https://www.boeing.com/commercial/freighters
- Leasing do 737-800BCF (The Loadstar, citando IBA): https://theloadstar.com/iba-warns-of-oversupply-of-narrowbody-conversions-and-lease-rate-fall/
- Valores e leasing do 767 convertido e do A320neo (IBA): https://www.iba.aero/resources/articles/aircraft-values-lease-rates-september-2024/
- Valor do ATR 72-600 (Ascend) e leasing de referência: https://jettly.com/post/atr-airplane-price

---

# Parte 2 — Mais aviões para companhias menores (pesquisa de 2026-09-24)

Mesmo método de conversão da Parte 1 (âncora ATR 72-600: 2,44 R$ por US$ de valor; leasing 5,0 R$/dia por US$/dia; combustível R$ 4,43/kg). Onde não há leasing público, usei ~1% do valor por mês (**estimativa**).

| | Cessna 408 SkyCourier (passageiros) | Let L-410 NG | ATR 42-600 | Embraer E175 (E1) |
|---|---|---|---|---|
| Perfil | Bimotor turboélice de 19 lugares, feito para regional e carga leve | Bimotor turboélice de 19 lugares, opera em pista de terra, areia e grama | Turboélice regional de 48 lugares, pista curta | Jato regional de 76 a 88 lugares |
| Passageiros | **19** | **19** | **48** (configuração padrão) | 76 (duas classes) a 88; no jogo, **80** |
| Velocidade de cruzeiro | **210 ktas (389 km/h)** | **417 km/h** | **556 km/h** (máx.); no jogo, 540 | ~800 km/h (**estimativa** de cruzeiro típico) |
| Alcance | **920 nm (1.704 km)** | **2.630 km** | **703 nm (1.302 km)** com passageiros máximos | **3.151 km** (versão STD) |
| Decolagem | **3.580 ft (1.091 m)**, pista de decolagem | **590 m** até 35 ft (MTOW, ISA, nível do mar) | **1.107 m** (MTOW); 982 m numa etapa de 300 nm | sem dado oficial público; jatos da classe, ~1.600–2.000 m |
| Pista de terra | não confirmado pela Cessna → **não** | **sim** (fabricante: grama molhada, areia, neve) | não | não |
| Consumo | ~0,93 kg/km (**estimativa**, 2 × PT6A-65SC) | ~0,8 kg/km (**estimativa**) | **802 kg em 300 nm** (ficha oficial) → 1,44 kg/km | ~2,3 kg/km (**estimativa**) |
| Preço real | **US$ 7,7 mi** equipado (2023) | ~**US$ 6–7 mi** (2023) | preço de lista **US$ 20–22 mi**; valor de mercado ~US$ 18 mi (**estimativa**) | leasing **~US$ 120 mil/mês** (6 anos de uso); valor ~US$ 20 mi (**estimativa**) |
| **No jogo: preço** | R$ 18,9 mi | R$ 15,9 mi | R$ 44 mi | R$ 48,8 mi |
| **No jogo: leasing/dia** | R$ 12,7 mil (*) | R$ 10,7 mil (*) | R$ 22,5 mil (*) | R$ 25,7 mil (inclui +30% dos jatos da Fase 2) |
| **No jogo: combustível/km** | R$ 4,10 | R$ 3,50 | R$ 6,40 | R$ 10,20 |
| **No jogo: pista mínima** | 1.100 m | 700 m (e pista de terra) | 1.000 m | 1.300 m |
| Licença | Táxi aéreo | Táxi aéreo | Regional | Nacional |

(*) estimativa pela regra de ~1% do valor por mês (no ATR 42, pela proporção do ATR 72: 0,76% ao mês).

**Onde cada um entra:**
- **SkyCourier e L-410:** o degrau entre o Caravan (12) e o ATR (48–70) no modelo Pequeno porte.
- **ATR 42-600:** dá ao Regional (e ao Pequeno porte que evoluir) um turboélice para cidades médias com pista curta.
- **E175:** jato regional menor que o E195-E2, para rotas longas com pouca demanda.

## Pista mínima de todos os modelos

O jogo usa a **pista mínima operacional em etapa curta**, e não a de peso máximo (MTOW): o Santos Dumont tem 1.323 m e opera A320 e 737 na vida real. A pista de decolagem com MTOW, ISA e nível do mar serve de referência:

| Modelo | Decolagem com MTOW (referência) | Pista mínima no jogo | Pista de terra |
|---|---|---|---|
| Grand Caravan EX | 426 m de corrida no solo (brochura) | 700 m | sim (trem fixo para pista rústica) |
| PC-12 NGX | 2.485 ft (757 m) (Pilatus) | 800 m | sim (**a confirmar**) |
| Twin Otter 300-G | STOL (**estimativa**, ~400 m) | 500 m | sim |
| L-410 NG | 590 m (fabricante) | 700 m | sim |
| SkyCourier | 1.091 m (Cessna) | 1.100 m | não |
| ATR 42-600 | 1.107 m (ATR) | 1.000 m | não |
| ATR 72-600 | 1.279 m (ATR) | 1.000 m | não |
| E195-E2 | 1.805 m | 1.300 m | não |
| E175 | ~1.600–2.000 m (**estimativa**) | 1.300 m | não |
| A320neo | ~1.980 m | 1.300 m | não |
| 737 MAX 8 | ~2.380 m | 1.300 m | não |
| A330-900 | ~3.000 m | 2.200 m | não |
| Cargueiros | ATR 72-600F como o ATR 72; 737-800BCF e 767-300F pesados | 1.100 / 1.600 / 2.200 m | não |

## Fontes da Parte 2

- Cessna SkyCourier (passageiros), página oficial: https://cessna.txtav.com/en/turboprop/skycourier-passenger
- SkyCourier, preço e dados gerais: https://en.wikipedia.org/wiki/Cessna_408_SkyCourier
- Let L-410 NG, fabricante (Aircraft Industries): https://www.let.cz/en/l410ng e https://en.wikipedia.org/wiki/Aircraft_Industries_L_410_NG
- ATR 42-600, ficha oficial (decolagem, consumo, alcance): https://www.atr-aircraft.com/wp-content/uploads/2020/07/Factsheets_-_ATR_42-600.pdf
- ATR 42-600, valores de mercado: https://www.aircraftvaluenews.com/atr-42-600-values-lease-rates-kept-aloft-by-niche-appeal/
- Embraer E175, especificações: https://embraer.com/e-jets/e175/en/ e https://aerocorner.com/aircraft/embraer-175/
- E175, leasing de mercado: https://www.aerfin.com/latest/interviews-and-articles/high-utilisation-keeps-e175-lease-rates-buoyant/
- Caravan em pista de terra: https://www.bjtonline.com/business-jet-news/cessna-208b-grand-caravan
- Decolagem de referência dos jatos (comparativos): https://simpleflying.com/shortest-takeoff-distance-passenger-planes/
