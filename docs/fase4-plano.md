# Fase 4 — Polimento: plano para aprovação

Aprovado em 2026-09-24: PWA sem dependência nova; sons ligados por padrão em volume baixo; onboarding como proposto; os três pendentes da seção 6 entram (ver CLAUDE.md, seção 19).

O CLAUDE.md prevê quatro itens: PWA instalável com funcionamento offline, exportar e importar o save em arquivo, onboarding mais guiado e sons opcionais. Proponho também um menu "Jogo" para reunir essas opções, e listo no fim os pendentes das fases anteriores que podem entrar aqui.

## 1. Menu "Jogo"

Hoje não há tela de opções. Um botão de engrenagem no topo, ao lado do tema, abre um painel com:
- **Salvar em arquivo** e **Carregar de arquivo** (item 2);
- **Sons** ligados ou desligados, com volume (item 4);
- **Refazer o tutorial** (item 3);
- **Tema** claro ou escuro (hoje é um botão solto no topo, que continua lá);
- **Novo jogo** (hoje só existe na tela de fim de jogo), com confirmação;
- versão do jogo e um aviso de "nova versão disponível" quando houver (item 3 do PWA).

## 2. Save em arquivo

- **Exportar:** baixa um arquivo `asa-norte_<companhia>_dia-<N>.json` com o estado completo do jogo. Serve de backup e para passar o jogo para outro aparelho.
- **Importar:** o jogador escolhe o arquivo; o jogo confere se é um save válido, passa pelas migrações de versão (um save antigo abre normalmente) e pede confirmação antes de substituir o jogo atual.
- **Erros:** arquivo inválido, de uma versão mais nova ou corrompido mostram uma mensagem clara, e o jogo atual fica intacto.

## 3. PWA instalável e offline

- **Manifesto:** nome, ícone, cor de tema e tela cheia, para instalar pelo navegador no celular e no computador ("Adicionar à tela inicial").
- **Ícones:** gerados a partir da marca do topo (o quadrado azul girado com o avião), em PNG de 192 e 512 px e no formato "maskable" do Android, mais o ícone da Apple.
- **Funcionamento offline:** um service worker guarda os arquivos do jogo na primeira visita. Depois disso o jogo abre sem internet. O save já fica no aparelho (IndexedDB), então nada muda nele.
- **Atualização:** quando sai uma versão nova, o jogo mostra "Nova versão disponível · Atualizar", em vez de trocar sozinho no meio de uma partida.
- **Sem dependência nova:** manifesto e service worker escritos no projeto, com um pequeno plugin no build do Vite que lista os arquivos a guardar. A alternativa seria a biblioteca `vite-plugin-pwa`, que exige instalar pacotes.
- **Desenvolvimento:** o service worker só é registrado no build, para não atrapalhar o `npm run dev`.

## 4. Onboarding guiado

Hoje há só o painel "Primeiro voo", com três passos em texto. Proposta:
- **Primeiros passos:** um roteiro curto no Painel, com progresso, que se marca sozinho conforme o jogador faz cada coisa:
  1. criar a primeira rota;
  2. ajustar tarifa ou frequência;
  3. avançar alguns dias e ver o resultado;
  4. responder a primeira carta de evento;
  5. fazer uma manutenção;
  6. abrir a segunda rota.
- **Destaque na tela:** o botão ou a aba do passo atual ganha um contorno pulsante, com uma frase curta, sem tapar a tela nem travar o jogo.
- **Dicas na primeira vez:** avisos de uma linha que aparecem uma única vez, quando algo acontece pela primeira vez: a primeira carta explica o arrastar para os lados, a primeira pane explica a condição dos aviões, o primeiro caixa negativo explica o crédito, e a primeira rota no prejuízo explica tarifa e frequência.
- **Pular e refazer:** "Pular tutorial" no roteiro e "Refazer o tutorial" no menu.
- **Por modelo:** o texto do primeiro passo muda para o Pequeno porte (pista curta, Caravan) e para o Low-cost (tarifa baixa).
- O progresso fica no save (marcas em `flags`, sem migração nova).

## 5. Sons opcionais

- **Sem arquivos de áudio:** sons curtos sintetizados no navegador (Web Audio), sem nada para baixar e sem pesar no jogo.
- **Momentos:**
  - carta de evento chegando;
  - escolha de carta;
  - conquista;
  - rota criada (decolagem curta);
  - pane (alerta grave);
  - dinheiro entrando num marco;
  - falência.
- **Quando toca:** nunca na velocidade 4× em sequência (um som a cada tantos segundos no máximo), nunca com a aba oculta, e respeitando a preferência do sistema.
- **Controles:** liga e desliga e volume no menu "Jogo"; a preferência fica no aparelho, fora do save.

## 6. Pendentes das fases anteriores (decidir se entram)

- **Idade dos aviões e mercado de usados** (adiado para "Fase 4/5"):
  - idade que aumenta a manutenção e reduz o valor de revenda;
  - aviões usados à venda por um preço menor.
  - É mudança de economia: exige rebalancear de novo.
- **Força da expansão no fim de jogo:** a estratégia com licenças chega a R$ 1,5 bi no dia 600 em GRU.
- **Carga no porão das rotas de passageiros:** ficou de fora na etapa de Cargas.

## 7. Ordem proposta

| Etapa | Conteúdo | Tamanho |
|---|---|---|
| 1 | Menu "Jogo" + exportar e importar save | pequeno |
| 2 | PWA: manifesto, ícones, service worker e aviso de atualização | médio |
| 3 | Onboarding: primeiros passos, destaques e dicas | médio |
| 4 | Sons | pequeno |
| 5 | Pendentes escolhidos | a definir |
| 6 | Revisão final: celular e desktop, acessibilidade, testes, build e simulação | pequeno |

Cada etapa com testes, commit próprio e conferência no navegador.
