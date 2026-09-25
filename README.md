# Asa Norte

Jogo de gestão de companhia aérea no navegador: frota, rotas, finanças e crises, com interface direta em
português do Brasil.

**Jogar:** https://davipurimazevedo-design.github.io/ArlineSim/

## No celular

Abra o link e instale como app. Depois da primeira visita, o jogo abre sem internet.

- **Android (Chrome):** menu ⋮ → **Instalar app**.
- **iPhone (Safari):** Compartilhar → **Adicionar à Tela de Início**.

O save fica no próprio aparelho. Para levar o jogo de um aparelho para outro, use o menu **Jogo** (engrenagem no
topo) → **Salvar em arquivo** e, no outro aparelho, **Carregar de arquivo**.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # testes do motor
npm run build    # build de produção em dist/
npm run sim      # simulação de balanceamento
```

A cada push na `main`, o GitHub Actions roda os testes, gera o build e publica no GitHub Pages
(`.github/workflows/pages.yml`). Regras, decisões e histórico de cada fase estão em `CLAUDE.md` e em `docs/`.

Contornos do mapa: Natural Earth (domínio público), via [world-atlas](https://github.com/topojson/world-atlas).
