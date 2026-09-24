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
