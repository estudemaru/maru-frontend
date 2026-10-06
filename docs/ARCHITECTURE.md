# Estado atual · 29/09/2026

A experiência combina o Arcade e a trilha, reativada com um jogo no fim de cada
lição. Trilhas temáticas, material para professores e atividades impressas
(exceto as folhas de repetição) seguem em pausa. Consulte
[a documentação da fase Arcade](./ARCADE-2026-09-29.md).
As seções abaixo registram também módulos preservados para reativação futura.

# Arquitetura do Maru

O produto começa com uma trilha para quem ainda não conhece japonês. Conteúdo
didático, regras de aprendizado, infraestrutura e interface são separados.
JavaScript nativo e CSS dão conta da aplicação: o código-fonte roda direto no
navegador durante o desenvolvimento, e só a publicação passa pelo esbuild, que
empacota e minifica os mesmos arquivos. Este
repositório contém a interface e as regras executadas no navegador; serviços,
credenciais e persistência vivem no repositório `maru-backend`.

## Fronteiras

| Camada | Responsabilidade |
| --- | --- |
| `shared/lessons/` | Texto das lições, exemplos, objetivos e perguntas. |
| `shared/curriculum.js` | As 15 unidades e os extras (lista de IDs por unidade), os temas de origem de cada lição e referências. |
| `shared/checkpoints.js` | Perguntas de cada checkpoint, conceitos críticos e a correção (80%). |
| `shared/kazu.js` | Jogo “Quanto, quando, qual”: leituras de números, horas, datas, contadores e これ/それ/あれ, alternativas e chaves de revisão. |
| `shared/videos.js` | Aulas do YouTube ligadas às lições, canais e URLs de miniatura e player. |
| `shared/renda.js` | Regras do jogo "Só mais um": conjunto de caracteres, alternativas e chaves de revisão. |
| `shared/catalog.js` | Combinações, kanji iniciais, partículas, expressões e frases. |
| `shared/vocabulary.js`, `glossary.js`, `exercises.js` | Vocabulário inicial, conceitos e perguntas por tipo. |
| `shared/pronunciation.js` | Texto e leitura correta das pronúncias aceitas pela API. |
| `shared/placement.js`, `learningPath.js` | Diagnóstico por unidade, unidades abertas, próxima parada e selos de conclusão. |
| `shared/discovery.js` | Cápsulas culturais e trilhas temáticas por referências ao acervo. |
| `maru-backend/supabase/functions/maru-api/` | API de produção, sessões Supabase Auth e progresso no Postgres. |
| `shared/gamification.js` | Níveis, missões e conquistas derivados do progresso. |
| `shared/content.js` | Kana básicos e acervo complementar preservado. |
| `shared/progress.js` | Normalização, migração, mesclagem, XP, constância e revisão. |
| `shared/sentenceCheck.js` | Verificação de exercícios conhecidos, reutilizada offline. |
| `shared/romaji.js` | Leitura de kana e comparação em diferentes grafias. |
| `maru-backend/backend/` | Serviços reutilizados e adaptador Node/SQLite local. |
| `frontend/assets/js/core/` | Estado persistido, áudio, ícones e helpers de UI. |
| `frontend/assets/js/features/` | Telas e controladores de cada atividade. |
| `frontend/assets/css/` | Sistema visual, layout, componentes e responsividade. |

Conteúdo e domínio compartilhados não dependem de DOM nem do servidor. As telas
chamam as regras de domínio sem reimplementar XP, migração ou revisão.

## Inicialização e navegação

1. O build (`scripts/build.js`) gera `dist/`, publicado na Vercel: o esbuild junta
   o CSS num arquivo e o JavaScript em módulos minificados com hash no nome, em
   `assets/build/`; imagens e dados são copiados como estão.
2. Em produção, `/api` é encaminhado à função Supabase; localmente, ao adaptador Node.
3. O HTML carrega o CSS e o módulo `app.js` (no build, já pedindo os módulos de que ele depende).
4. O store lê o estado local, migra dados antigos e mescla o snapshot da API.
5. O app monta o shell e escolhe a tela pela URL, como `#/lesson/welcome`.
6. Cada tela renderiza em main e devolve um cleanup para eventos e recursos.
7. Ao navegar, o app limpa os recursos, interrompe o áudio e foca o título.

O `app.js` importa só o início (`dashboard.js`). As outras telas ficam em `SCREENS`
e são baixadas com `import()` na primeira vez que a rota abre (`SCREEN_OF` liga cada
rota ao seu módulo). Depois da primeira tela, o navegador ocioso pré-carrega as
demais, então as navegações seguintes não esperam a rede. Uma navegação mais nova
durante um download descarta a anterior. Se o módulo não chegar (sem conexão, ou
uma versão nova publicada com a aba aberta), a tela oferece recarregar a página.
Uma tela nova precisa entrar em `SCREENS`/`SCREEN_OF` e na lista de `views`.

Histórico, links diretos e recarga funcionam com rotas por hash. O shell fica
montado entre telas. Alterações de progresso atualizam seus contadores sem
reconstruir uma atividade em andamento. Na navegação móvel, as regiões
inativas recebem inert; foco e Escape são tratados pelo shell.

A barra lateral contém sete destinos: Início, Minha trilha, Jogos e prática,
Revisão, Explorar, Imprimir e Aulas gratuitas. core/navigation.js centraliza os destinos, os recursos e a relação
de cada tela com sua seção. Essa relação mantém o destaque do menu e o link de
retorno no cabeçalho, inclusive ao abrir uma URL diretamente. O seletor de tema
e Meu ritmo ficam no rodapé da barra, separados da navegação de estudo.

Jogos e prática reúne desafios por tempo, exercícios/escuta, escrita e frases. Explorar organiza as consultas
por fundamentos, cultura e materiais de apoio, com busca sem distinção de acentos.
Os filtros são guardados por aba em sessionStorage; voltar de um material restaura
a busca. Nenhuma rota de conteúdo foi removida.

## Telas

- Dashboard: próximo passo, meta diária e acesso às práticas.
- Journey: mapa de linhas de trem; próxima parada, as 15 unidades com cadeado, uma estação por lição, o checkpoint e os extras.
- Checkpoint: as perguntas da unidade, uma por vez, e o resultado com o que revisar.
- Lesson: abertura com objetivo e vídeo, partes curtas, resumo, perguntas explicadas, jogo e próxima parada.
- Kana: tabela, fileiras e configuração das rodadas.
- Practice: rodada reutilizável, respostas e repetição dos erros.
- Writing: modelos, animação e canvas.
- Sentences: blocos e digitação para situações específicas.
- Reference: kanji, partículas, expressões, biblioteca e revisão.
- Study: palavras por tema, exercícios, escuta e glossário.
- Worksheets/Book 1: folhas avulsas e volume colorido adaptado do currículo existente; `book-content.js` define a progressão impressa em kana e a seleção de dez kanji básicos exclusiva da seção final, sem alterar o curso online.
- Teacher/Package: seleção de etapa ou tema codificada no link público; não há tabela de turmas, contas de aluno nem acesso ao progresso individual.
- Worksheets: folhas A4 de caracteres, palavras e frases com gabaritos opcionais; seleção livre de caracteres e páginas extras de repetição vazias.
- Settings: modo visual, áudio, romaji, meta diária, indicadores e conquistas.

## Persistência

O schema v2 contém lessons, reviews, activity, preferences e updatedAt, além
dos campos anteriores progress, kanaStats, xp, streak e stats. Os campos placement
e restDays registram o diagnóstico e as pausas protegidas sem alterar dados anteriores.
`arcade` guarda recordes e `daily`, o primeiro resultado de cada desafio do dia.

A normalização limita números, valida estruturas e converte revisões antigas.
A mesclagem mantém a união das conclusões e os registros de revisão mais
recentes; contadores históricos preservam o maior valor. No `daily`, vale a
conclusão mais antiga de cada data.

O navegador grava imediatamente em `maru-learning-v2` para convidados e em
`maru-account-<id>-v2` para cada conta. A importação anônima é feita uma vez por
conta neste navegador; logout restaura o perfil anônimo sem misturar caches. Chaves
`maru-*-v1` e `nihongo-dojo-*-v1` são lidas na primeira migração e permanecem
intactas. O envio ao servidor é serializado, com debounce, timeout e retomada
ao voltar à conexão. A UI distingue salvamento no servidor, somente no
navegador e somente na sessão.

O `maru-backend` normaliza novamente e mescla snapshots na tabela
`public.maru_progress` do Supabase com controle de versão. Contas por e-mail usam
Supabase Auth e cookies HttpOnly; a identificação anônima nunca permite escolher
uma conta. A identidade é conferida antes das escritas para impedir misturas ao
trocar login. O adaptador SQLite permanece somente para desenvolvimento local
e leitura de dados legados. Veja a documentação do backend para publicação e
recuperação de dados.

## Regras de aprendizado

Uma lição exige responder corretamente a todas as perguntas. As erradas são
explicadas e retornam antes da conclusão. Os 30 XP são concedidos uma vez.
Depois das perguntas, a lição termina num jogo curto com os próprios exemplos
(`shared/lessonGame.js`, tela em `features/lessonGame.js`); a conclusão já está
registrada quando ele começa, então sair ou pular o jogo não desfaz a lição.

Rodadas usam no máximo dez itens. Cada resposta verificada é registrada uma
vez antes do avanço. Distratores são distintos e pertencem ao mesmo tipo de
pergunta. Três acertos seguidos são um indicador de prática, não uma certificação.

Erros retornam em dez minutos. Os acertos são agendados pelo FSRS (`ts-fsrs`, o
mesmo algoritmo do Anki): cada revisão guarda estabilidade, dificuldade, estado e
esquecimentos (`stability`, `difficulty`, `state`, `lapses`) junto dos campos
antigos, e o intervalo cresce conforme a memória fica estável, até 365 dias.
Repetir um item na mesma sessão não infla a memória. Sem "fuzz", o agendamento é
reproduzível; sem passos curtos, os intervalos são em dias. Registros anteriores
viram um cartão aproximado a partir do intervalo que já tinham. As chaves de
revisão já separam a habilidade (`arcade:karuta:kana:listen:…` é ouvir,
`arcade:pictures:…:write:…` é escrever), então a mesma palavra tem um agendamento
por jogo. A prática livre continua disponível.

O registro de escrita concede 5 XP uma vez por folha/caractere aberto e não
altera o desempenho de reconhecimento de kana. A caligrafia é autoavaliada.

## Frases, áudio e escrita

A API de frases recebe exerciseId e text. Compara modelos canônicos em japonês,
leituras em kana e formas de romaji previstas. Divergência significa “diferente
do modelo”, não “gramaticalmente impossível”. O mesmo código funciona localmente.
O formato legado com item permanece, sem dar notas artificiais a frases livres.

O áudio usa `POST /api/audio`. O `speechService.js` do backend valida o texto contra o catálogo
de estudo, consulta TTS Quest e devolve uma URL de streaming. Só URLs expiráveis
ficam em memória; o servidor e o frontend não escrevem áudio no disco. O player
cancela requisições e reprodução ao navegar, respeita a velocidade escolhida e
trata falhas, limites da API e bloqueio de reprodução automática. `preload(texto)`
prepara uma URL sem tocar (usado pela karuta para a próxima rodada); os erros
trazem `status` e `retryAfter` para quem precisa esperar um 429.

`core/kanji.js` consulta KanjiAPI ao abrir um caractere. Valida campos, compartilha
requisições simultâneas, mantém cache de 24 horas e usa a cópia dos 20 caracteres
se a rede falhar. As explicações e traduções em português continuam sendo autorais.

`frontend/assets/data/strokes.json` contém os caminhos em ordem extraídos de
KanjiVG: 142 kana e 20 kanji. A atualização é manual:
`python3 scripts/fetch-strokes.py`. O uso normal não precisa da rede.
O arquivo derivado mantém CC BY-SA 3.0 e atribuição.

O canvas usa coordenadas normalizadas e redesenha ao mudar de tamanho.
Pointer Events permitem mouse, toque e caneta. Mostrar o guia não limpa o
desenho. Animações respeitam a preferência por movimento reduzido.

## Bibliotecas de terceiros

As bibliotecas ficam como arquivos ES module copiados de
`node_modules` por `npm run vendor` (`scripts/vendor.js`), com o aviso de licença
MIT ao lado. Para atualizar, mude a versão em `package.json`, rode `npm install`
e `npm run vendor`, e copie `shared/vendor/` para o `maru-backend`.

- `ts-fsrs` → `shared/vendor/ts-fsrs.js`: agendamento da revisão em
  `shared/progress.js`; roda no navegador, no Node e na Edge Function.
- `wanakana` → `frontend/assets/vendor/wanakana.js`: `core/kanaInput.js` liga a
  conversão romaji → kana nos campos com `data-kana` (Arcade, shiritori, desafio
  do dia). Só é baixada quando um desses campos aparece. Minúsculas viram
  hiragana e MAIÚSCULAS, katakana; o botão あ/ア força katakana. O "n" final é
  convertido no envio (captura do `submit`), antes de a tela conferir a resposta.
  A preferência `preferences.kanaInput` (padrão ligado) desliga a conversão.

`dnd-kit` é uma biblioteca de React e não se aplica aqui. Para arrastar blocos
no futuro "Monte a frase", Pointer Events nativos (como no caderno de escrita)
ou SortableJS servem sem React.

## Letra do japonês nos jogos

Meu ritmo oferece seis letras para kana e kanji dos jogos (`core/jpFont.js`):
Mincho clássica (Shippori Mincho, padrão), Gótica (Noto Sans JP), Caderno
escolar (Klee One), Arredondada (Zen Maru Gothic), Arredondada firme (M PLUS
Rounded 1c) e Caneta (Zen Kurenaido). A escolha fica em
`preferences.jpFont`, validada em `normalizeSnapshot`, e vira a variável
`--font-game-jp` com `html[data-jp-font]`. Ela vale para o japonês dentro de
`.play-page`, `.lesson-game` e `.practice-session`; o resto do site mantém a
letra do tema. Mincho e gótica já vêm na página; as demais só são baixadas ao
serem escolhidas, e a tela de ajustes baixa apenas os caracteres das amostras
(`text=` do Google Fonts).

## CSS

A folha anterior foi substituída integralmente:

- foundation/tokens.css: cores, fontes e tokens estruturais;
- foundation/base.css: reset, tipografia, foco e movimento;
- layout.css: shell, navegação, cabeçalhos e rodapé;
- components.css: botões, campos, exemplos e feedback;
- screens.css: composição de cada tela;
- themes/arcade.css: variantes do modo Arcade, condicionadas por data-theme;
- responsive.css: desktop, tablet e celular, com prioridade sobre o tema;
- learning.css: vocabulário, exercícios, temas, missões e conquistas;
- navigation.css: navegação simplificada, páginas Praticar/Explorar e busca;
- motion.css: entradas, interação e movimento das ilustrações;
- print.css: papel A4, grades sem degradê e paginação independente do tema.
- interface.css: geometria comum aos dois mundos, movimento fluido e ajustes de toque;
- themes/showa.css: paleta e ornamentos dos dois temas, no estilo de cartaz Shōwa
  retrô em cores tradicionais japonesas (和色): papel 生成り, índigo 藍, vermelho 朱
  e dourado 金. Barra lateral índigo, molduras finas com sombra índigo deslocada,
  botão principal em pílula (índigo de dia, creme à noite) com ícone num círculo
  vermelho, cartas de karuta com moldura vermelha dupla e ◎ vermelho no acerto.
  Os ornamentos ficam nas bordas; o conteúdo continua limpo. O modo noturno usa as
  mesmas regras com paleta de noite índigo (`--paper` #111a2c), detalhes dourados
  e o vermelho mais aceso; `--seal` é o vermelho dos selos preenchidos, mais
  fechado que `--accent` para manter o contraste do texto creme;
- themes/wagara.css: camada final, com os padrões japoneses (和柄), a capa e o
  movimento. Os padrões são máscaras em `assets/img/wagara/` (só a forma; a cor
  vem de `--pattern`): 青海波 seigaiha no fundo da página, nas ondas da capa e nos
  divisores; 麻の葉 asanoha na barra lateral; 七宝, 亀甲, 鱗 e 市松 nas artes dos
  jogos, como papéis chiyogami. No escuro, linha clara sobre fundo escuro cansa a
  vista: o fundo e a barra lateral usam índigo sobre índigo (`--pattern-soft`,
  `--ai-pattern`) e o dourado fica só nos detalhes, com opacidade menor. As
  opacidades ficam em variáveis no topo do arquivo (`--pattern-page` é a do fundo)
  e valem em qualquer largura e com movimento reduzido. A capa é uma janela redonda (丸窓) desenhada em
  SVG no `dashboard.js`, com cores por variável: sol vermelho de dia; lua,
  estrelas e montanhas azuladas à noite; névoa, pássaros, ondas e pétalas de
  sakura em camadas próprias. O desafio do dia vira uma folha de calendário de
  destacar (日めくり) com o dia da semana em kanji e o carimbo 済 quando feito.
  Os cartões de jogo ficam em pé, três por linha nas telas largas;
- themes/mobile.css: a escala final do celular (até 600 px), carregada depois de
  wagara.css, por cima dos tamanhos de desktop e de temas antigos empilhados nas
  outras folhas: títulos de página com 26 px (a capa, ~34 px), texto corrido com
  14 px e entrelinha 1,6, painéis e cartões com 16 px de respiro, controles com
  44 px e campos de texto com 16 px de letra (o iPhone não dá zoom ao focar). Os
  jogos viram uma lista com a arte em miniatura. Um piso de legibilidade mantém
  rótulos em maiúsculas com pelo menos 11 px, notas com 12 px e só selos e números
  com 10 px;
- themes/sumi-book.css: Sumi-e (claro), o caderno de tinta e papel;
- themes/arcade-world.css: Arcade (escuro), a mesma estrutura do Sumi-e em pixels e
  neon: fundo #080f22 com grade, bordas quadradas com sombra deslocada, títulos em
  Space Grotesk e rótulos/placares em Press Start 2P. Os IDs internos continuam
  `dojo` e `arcade`.

Movimento: o movimento contínuo anima só `transform` e `opacity`, com
desaceleração suave (`--ease-out`); entradas pontuais, como o texto vertical da
capa e a troca de tema, podem animar `clip-path` uma vez. Levantar cartões ao passar o mouse vale só para mouse; no toque
há um leve "aperto" ao pressionar. Decorações contínuas usam `will-change`, a
troca de tema usa View Transitions quando o navegador permite (a partir de um
botão, o novo tema se abre num círculo que nasce dele), e tudo respeita
`prefers-reduced-motion` e o botão de pausar animações. A capa entra em camadas
(título, pincelada, janela, sol nascendo, texto vertical escrito, hanko
carimbado); ao rolar, os cartões sobem conforme entram na tela onde o navegador
oferece `animation-timeline: view()`. Sem movimento, as pétalas não aparecem. No celular: toque sem
atraso (`touch-action`), alvos de 44 px, áreas seguras (`viewport-fit=cover`) e
teclado virtual que redimensiona a página (`interactive-widget`).

Dojo usa papel claro (#f8f7f3), superfícies quase brancas, washi em SVG estático, tinta escura,
Shippori Mincho e vermelho de hanko. themes/dojo.css concentra essa identidade;
experience.css compõe as novas telas e contém o selo da home em tamanhos móveis.
Arcade usa pixels e neon, sem camada de escurecimento sobre o conteúdo.
Animações respeitam movimento reduzido; o botão na home permite pausá-las e
guarda a escolha neste navegador, sem mudar o progresso de estudo.
Os seletores de Arcade usam `:where()` para não impedir os ajustes de responsividade.
A troca atualiza tokens sem reconstruir o DOM da atividade. Fontes externas têm
fallbacks locais. React, Motion e Anime.js foram removidos; as animações de
traços usam a Web Animations API.
As animações de interface usam CSS, respeitam prefers-reduced-motion e são
desativadas na impressão. Ilustrações usam transformações; textos não recebem
animação contínua. A troca de tema continua preservando a atividade em andamento.

## API

| Método | Caminho | Uso |
| --- | --- | --- |
| GET | /api/health | Saúde e versão. |
| GET | /api/content | Currículo, catálogos e campos legados. |
| GET | /api/progress | Snapshot normalizado. |
| PUT / POST | /api/progress | Persistência de snapshot. |
| POST | /api/phrase/check | Comparação com o modelo de uma atividade. |
| POST | /api/audio | URL de reprodução remota de uma pronúncia do catálogo. |

GET /api/account informa a sessão; GET /api/auth/google inicia OAuth;
GET /api/auth/google/callback valida state, PKCE, nonce e identidade.
POST /api/auth/logout revoga a sessão.
O navegador envia o perfil anônimo em x-maru-user; contas são resolvidas pelo cookie.
Escritas de conta exigem a identidade esperada em x-maru-account e origem válida.
Esse cabeçalho previne gravações de abas obsoletas e não autentica sozinho.
JSON inválido retorna 400; corpo excessivo, 413; caminhos inexistentes, 404.

## Verificação

`npm run check` verifica sintaxe dos módulos e imports das folhas de estilo.
`npm test` cobre currículo, respostas, traços, migração, revisão e constância.
Os contratos HTTP e as gravações concorrentes são testados no `maru-backend`.

`npm run test:e2e` usa servidor e dados isolados. Verifica conclusão e retomada,
erros, kana digitado, frases, escrita, filtros, revisão, fallback local,
histórico e teclado. As telas são verificadas em 320, 390, 768 e 1440 pixels
com captura dos erros do navegador.

Os testes de voz usam respostas controladas e áudio em memória para não consumir
a cota pública. Uma verificação separada confirmou reprodução real do streaming
TTS Quest. PDFs são gerados no teste e conferidos por número de páginas.


## Camadas de descoberta e orientação

O diagnóstico é acessado pela home e configurações, sem item extra no menu.
Seu resultado não passa por completeLesson ou recordReview: apenas placement é
salvo. learningPath.js abre as unidades até a aceita e seleciona a próxima parada a
partir dela. As unidades anteriores contam como vencidas e aparecem como revisão
opcional.

Trilhas temáticas ficam em
Descobrir, assim como os imprimíveis. Cápsulas aparecem na última explicação da
lição correspondente. Selos derivam de todas as lições reais de uma unidade; não são
uma segunda fonte de verdade para o progresso.

O material para professores também fica em Descobrir e pode ser acessado pela
home. O Livro 1 usa as lições e catálogos já publicados, imprime gabaritos ao
final e não afirma equivalência a uma certificação JLPT. As artes do Irasutoya
têm inventário de origem e registro da autorização informada pela responsável
para o uso educacional gratuito do Maru, sem o antigo teto interno de 20.
Todo o acesso ao conteúdo permanece gratuito, sem pedidos de apoio financeiro.

Um único dia sem estudo pode ser protegido por semana de segunda a domingo.
A proteção só é registrada quando a pessoa volta no dia seguinte à pausa e não
gera atividades ou XP. Lacunas maiores ou uma segunda pausa na semana reiniciam
a sequência. A contagem continua medindo dias em que houve estudo.


## Jogos e leitura para iniciantes

`#/challenge` oferece hiragana, katakana, frases e escuta em rodadas de até cinco
itens. `shared/challenge.js` controla as fases e compara prazos absolutos: uma
resposta no limite do prazo já conta como tempo esgotado, mesmo se a aba dormiu.
Uma tentativa é encerrada uma única vez. O tempo é de 15, 30 ou 60 segundos por
item, com opção sem cronômetro. Na escuta, a contagem começa somente quando o
player consegue iniciar; uma falha de preparação não registra erro.

Resultados usam `recordReview` e os identificadores já existentes. Acertos de
frases também atualizam `sentencesWritten`. A tela final agrupa erros por família
ou padrão de frase, mostra os modelos e leva ao conteúdo correspondente. A lista
da rodada é temporária; acertos, erros e revisões integram o snapshot sincronizado.

`core/beginner.js` verifica a conclusão de pelo menos 80% das lições de hiragana
**e** katakana. Antes disso, `jpHTML` privilegia a leitura em kana e as explicações
usam as leituras editoriais do livro. Consultas e lições explícitas de kanji
continuam disponíveis. As alternativas mantêm seus valores e índices originais
para não mudar a correção das atividades.

`#/account` dá acesso direto à conta por e-mail. O formulário continua disponível
em configurações para preservar links anteriores. A API de produção já oferece
cadastro, login, recuperação e troca de senha no Supabase Auth; o adaptador Node
local não oferece esses endpoints. O funcionamento público depende das URLs
permitidas e do SMTP descritos na documentação de publicação do backend.

`#/videos` lista as aulas de `shared/videos.js` por etapa e lição. As lições e a
página usam `core/videos.js`: até o clique há só a miniatura (i.ytimg.com); o
player `youtube-nocookie.com` entra no lugar dela quando a pessoa toca no play.
Cada aula tem link para abrir no YouTube e crédito do canal. `trail.css` contém os
layouts destas telas; `mobile-calm.css`, carregado logo depois, guarda os extras
de todas as telas no celular (abaixo).


## Trilha do zero (01/10/2026)

A trilha foi reescrita para quem começa do zero, em linguagem simples. São 51
lições: o hiragana passou de 6 para 14 lições (uma família por vez, com dica de
memória para cada caractere) e o katakana de 5 para 8. Os IDs antigos foram
mantidos, então o progresso de quem já estudava continua valendo; `h-rows` virou a
revisão de K a H e `h-rest` fecha a tabela com わ, を e ん.

- `features/journey.js`: mapa de linhas de trem. Cada unidade tem uma cor
  (`--line-*` em `trail.css`), o mapa no topo leva a cada unidade e a próxima parada
  (uma lição ou o checkpoint) mostra "Você está aqui".
- `features/lesson.js`: abertura (objetivo, plano da lição e vídeo), uma parte por
  seção, resumo na última parte, perguntas, jogo e conclusão com a próxima parada.
  Exemplos de um kana com dica viram cartões que tocam o som. A conclusão das
  lições de kana e kanji oferece o "Só mais um" já limitado às letras vistas.
- `features/renda.js` + `shared/renda.js`: "Só mais um" (renda, 連打). Quatro
  botões grandes, só toque (ou teclas 1–4), avanço automático no acerto e a dica
  de memória da lição no erro. As respostas entram na revisão espaçada como
  `arcade:renda:<escrita>:<read|find>:<id>` (por caractere, não pela seleção da
  tela) e os recordes como `arcade["renda:<escrita>:<letras>:<modo>:<segundos>"]`.
  Não há campo novo no snapshot.
- No celular (até 600 px), jogos, estações, etapas fechadas, cartões de kana,
  aulas, Consultar e Meu desempenho ficam em grade de duas colunas.
- O Livro 1 impresso continua com as 36 lições originais (`ONLINE_ONLY`).
- Papel e lápis: o campo de atividade (uma opção só) fica oculto; no celular, os
  campos ficam em duas colunas, a família vira uma grade de toque (o select segue
  no desktop) e o resumo com o botão de imprimir fica numa barra presa ao pé da tela.

### Celular só com o essencial (`mobile-calm.css`)

No celular (até 600 px) cada tela mostra o que a pessoa precisa para agir: o
título, a escolha e o botão. O resto fica a um toque ou só aparece em tela larga.
No computador nada muda.

- `.only-wide` marca no HTML o que é extra: avisos e dicas longas (`tip-box`,
  `learning-intro`), explicações de regra dos jogos (o relógio do desafio, as
  teclas 1–4), notas de rodapé e o painel "Sobre este espaço". Créditos exigidos
  (VOICEVOX, JMdict) e as regras do karuta e do shiritori continuam visíveis.
- `moreHTML(label, body)` (`core/ui.js`): no celular, os detalhes de um cartão
  (frase de exemplo, contexto, "Adicionar à revisão") ficam num `<details>`
  fechado; em tela larga o conteúdo sai direto no cartão, com o HTML de antes.
  Usado em Primeiras palavras, Expressões, Biblioteca e Partículas. O glossário
  segue a mesma ideia com o termo como resumo. O cartão aberto ocupa a linha
  inteira da grade e continua à vista (`app.js`, ouvinte de `toggle`).
- Cortes só por CSS: a paisagem da capa, os rótulos em maiúsculas sobre os
  títulos, o mapa da trilha (as etapas logo abaixo já levam a cada uma), o plano
  da lição (o botão "Começar a lição" sobe para antes do vídeo), a descrição dos
  cartões de jogo, dos materiais e dos exercícios, e as descrições de tema e de
  letra em Meu ritmo.
- Grades: Palavras, Biblioteca, Partículas, Expressões e o glossário em duas
  colunas; kanji em três.


## Unidades e checkpoints (05/10/2026)

Fase 1 de `docs/TRILHA-N5.md`: a trilha passou de 9 etapas abertas para 15 unidades
em ordem, mais três extras, sem conteúdo novo em japonês.

- **Unidade e tema.** `MODULES` (as unidades e os extras) decide a posição na
  trilha. `THEMES` guarda as etapas antigas e decide o que depende do tipo de
  conteúdo: o jogo de cada lição (`lessonGame.js`), o Livro 1 (`book-content.js`),
  o modo de leitura antes do kana e o treino "Só mais um". Cada lição tem os dois:
  `moduleId` e `theme`.
- **Bloqueio sem estado novo.** `unitStates` calcula tudo a partir das lições, dos
  checkpoints e do diagnóstico. Uma unidade abre quando a anterior foi vencida
  (checkpoint aprovado; na unidade 0, as aulas lidas), quando o diagnóstico aceito
  começa nela ou depois, ou quando a pessoa já concluiu alguma aula dela. Unidades
  ainda sem aulas abrem e contam como vencidas.
- **Checkpoints.** `shared/checkpoints.js` escolhe à mão perguntas das lições da
  unidade. Uma lição que ainda mistura ideias de várias unidades só cede as
  perguntas da ideia desta unidade. Unidades com poucas perguntas completam a prova
  com itens do jogo "Quanto, quando, qual". Para passar: 80%, sem nenhum conceito
  crítico com todas as perguntas erradas. Os erros aparecem no resultado, com o
  link da aula; ainda não entram na revisão do FSRS.
- **Progresso.** `checkpoints` guarda, por unidade, `passedAt`, `best`, `attempts`
  e `updatedAt`. Progresso antigo vira `{}`, e chaves desconhecidas são mantidas. A
  mescla guarda a primeira aprovação e a melhor nota. O diagnóstico salvo com as
  etapas antigas é traduzido para a unidade equivalente (`sentences` → `meet`,
  `everyday` → `numbers`). Como `progress.js` também roda no backend, a Edge
  Function precisa ser publicada antes do frontend: a versão antiga descartaria o
  campo novo.

## Quanto, quando e qual (05/10/2026)

As seis lições de `shared/lessons/numbers.js` ensinam números até 10.000, horas e
minutos, dias da semana, meses e dias do mês, contadores (つ, 人, 本, 枚, 匹) e a
série こ/そ/あ/ど, inclusive こちら/そちら/あちら/どちら. Elas nunca foram uma etapa
publicada: entram direto nas unidades 4, 6, 7 e 13. O tema `numbers` fica fora do
Livro 1 e das leituras que ele usa para trocar kanji por kana (`book-content.js`),
porque horas e datas pedem kanji.

Cada lição termina no jogo de leitura e leva, pelo botão de prática, ao jogo do Arcade
“Quanto, quando, qual” (`features/kazu.js`) já na categoria dela. O jogo usa as peças
visuais do “Só mais um”. As leituras de `shared/kazu.js` são escritas à mão:
`traps` guarda erros comuns (さんほん, よんじ, はちにち) e `alt`, variantes aceitas
(じっぷん, はちふん), que nunca aparecem como alternativa errada. Do português, os
contadores mostram o mesmo número com outro contador; つ só entra quando a pergunta
é sobre pessoas ou bichos, porque também serve para objetos. A revisão fica em
`arcade:kazu:<categoria>:<read|meaning>:<id>`.

Os itens do jogo e os exemplos dessas lições entram no catálogo de voz com a leitura
ensinada (よじ, ついたち), não com a escrita, para a síntese não escolher outra
leitura. `tests/kazu.test.js` confere leituras irregulares, alternativas únicas e
a pronúncia de cada item.
