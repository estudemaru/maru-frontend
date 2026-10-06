# Conteúdo e progressão didática

A trilha assume zero conhecimento de japonês. O aluno recebe explicação em
português antes dos exercícios; exemplos trazem japonês, leitura de apoio e
tradução.

A trilha tem 15 unidades em ordem, do zero ao N5 (o plano completo está em
`TRILHA-N5.md`). Cada unidade termina num checkpoint, e a seguinte só abre depois
dele. Arcade, revisão, consulta, folhas e os extras continuam livres. Esta é a
fase 1: as lições atuais nos novos lugares, sem conteúdo novo. Uma lição que ainda
ensina várias ideias fica inteira, na unidade da primeira delas.

| Unidade | Lições | Resultado esperado |
| --- | --- | --- |
| 0 Começando do zero | 3 | Saber como o japonês é escrito e como estudar (sem checkpoint). |
| 1 Hiragana | 10 | Uma família por lição (あ, か, さ, た, な, は, revisão, ま, や/ら, わをん). |
| 2 Hiragana avançado | 4 | ゛゜, combinações, palavras e uma cena. |
| 3 Apresentar-se | 5 | Cumprimentar, dizer quem é, perguntar com か, の e も. |
| 4 Coisas ao meu redor | 1 | これ/それ/あれ e この/その/あの. |
| 5 Katakana | 8 | Vogais e K; S/T; N/H; M a ン; formas parecidas; ー e sons adaptados; palavras e cena. |
| 6 Números | 3 | Números com kanji, até 10.000, e preços. |
| 7 Tempo | 3 | Horas, dias da semana, meses e datas. |
| 8 Lugares | 2 | ここ/そこ/あそこ/どこ e あります/います. |
| 9 Verbos e rotina | 6 | を, に, へ, で, ます e ません, pedidos e pedidos de ajuda. |
| 10 Descrição | 1 | Adjetivos い e な. |
| 11 Gostos, 12 Passado, 14 Forma て | 0 | Em preparo; a trilha passa direto por elas. |
| 13 Quantidades | 1 | つ, 人, 本, 枚 e 匹. |

Extras, sempre abertos e sem checkpoint: Gramática para curiosos (2), Kanji como
sistema (3) e Além dos livros (5).

## Voz das lições

Escreva como quem explica para um amigo que nunca estudou japonês: frases curtas,
"você", exemplos do dia a dia brasileiro e nenhum termo técnico sem explicação na
mesma frase. Cada lição tem:

- `hook`: uma frase que abre a lição e diz por que ela vale a pena (aparece na
  abertura, no mapa da trilha e no cartão da home);
- seções curtas; no `body`, cada linha vira um parágrafo e linhas que começam
  com `• ` viram lista;
- `recap`: duas ou três frases que fecham a leitura antes das perguntas.

Nas lições de kana, cada caractere é um exemplo próprio com o som de referência em
português (`pt`) e uma dica de memória autoral (`note`). Exemplos assim viram
cartões grandes que tocam o som. As dicas fixam a forma; não explicam a origem do
caractere. O jogo "Só mais um" reaproveita essas dicas quando a pessoa erra.

## Aulas em vídeo

`shared/videos.js` liga aulas públicas do YouTube às lições (campo `lessons`).
Antes de incluir um vídeo, confira pelo oEmbed
(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=ID&format=json`)
que ele existe, aceita incorporação e pertence ao canal indicado. Aulas em
português aparecem antes das em inglês. O player usa `youtube-nocookie.com` e só
carrega depois do clique; até lá a página mostra apenas a miniatura.

## Critérios editoriais

- Ensinar cinco vogais antes de apresentar toda a tabela.
- Distinguir 46 kana básicos de formas com marcas e combinações.
- Explicar as partículas は (wa), へ (e) e を (o).
- Tratar vogais longas e pequenos っ e ゃゅょ como contrastes relevantes.
- Apresentar kanji dentro de palavras, sem prometer uma única leitura.
- Associar partículas a funções e contexto, evitando traduções fixas.
- Manter frases guiadas semanticamente coerentes, com situações e modelos autorais.
- Explicar formas educadas e informais antes das gírias.
- Mostrar contexto e alternativas neutras para expressões informais.
- Evitar equivalências literais, como “いただきます = bom apetite”.
- Não apresentar N1 como “nativo” ou a biblioteca como lista oficial do JLPT.
- Explicar respostas e permitir refazer o que foi errado.

As perguntas verificam compreensão introdutória. Reconhecimento de kana,
escrita e construção de frases complementam a leitura. O resultado não prova
fluência, boa caligrafia ou capacidade de manter conversações espontâneas.

## Acrescentar uma lição

1. Adicione-a ao arquivo temático em shared/lessons, com ID estável.
2. Inclua objetivo, duração, seções, exemplos, perguntas explicadas, `hook` e `recap`.
3. Defina o índice da resposta correta em cada pergunta.
4. Para prática complementar, informe uma rota existente e parâmetros.
5. Coloque o ID na lista da unidade em curriculum.js (`MODULES`), na posição certa,
   e no tema dela (`THEMES`): o tema decide o jogo da lição e o Livro 1.
   Perguntas sobre a ideia da unidade podem entrar no checkpoint dela, em
   shared/checkpoints.js.
6. Se houver aula em vídeo, ligue o ID dela em shared/videos.js.
7. Execute as verificações e teste leitura e prática.

IDs existentes são usados no progresso: renomeá-los exige migração.
Ao ampliar a trilha, atualize as contagens nos testes e neste guia.

## Referências

O texto das lições e os modelos de atividade são originais desta aplicação.
Os recursos abaixo servem como referência e estudo complementar; não implicam
afiliação ou aprovação do Maru por essas organizações.

- [Irodori Starter, Japan Foundation](https://www.irodori.jpf.go.jp/en/starter/pdf.html):
  material introdutório voltado a situações de comunicação e áudios de falantes.
- [Marugoto A1, hiragana e katakana](https://a1.marugotoweb.jp/en/hiragana.php):
  apoio ao estudo dos silabários.
- [Descrições oficiais N1–N5 do JLPT](https://www.jlpt.jp/e/about/levelsummary.html):
  limites e competências associadas aos níveis.
- [KanjiVG](https://kanjivg.tagaini.net/):
  modelos de ordem dos traços, Ulrich Apel e colaboradores, CC BY-SA 3.0.

As aulas em vídeo vêm dos canais 123 Japonês, Nihongando com Nanda, Programa
Japonês Online e JapanesePod101 (em inglês). Não há afiliação com o Maru.

Os 120 itens anteriores foram mantidos como consulta complementar. Suas
etiquetas de nível são orientativas. Gírias e jargões variam por comunidade,
época e relação; a seleção não pretende cobrir todas as variações.

## Atividades e explicações

O vocabulário inicial contém 64 palavras em sete temas. Cada palavra recebe
leitura em kana, romaji, tradução e uma frase contextualizada. O glossário
define 26 conceitos e é ligado às seções das lições por termos presentes no texto.

Os 32 modelos de frases usam tokens com texto, romaji, função e leitura em kana.
As atividades de partículas sempre indicam a intenção pedida, evitando tratar
como erro absoluto uma alternativa possível em outro contexto. Gírias incluem
situação, grau de informalidade e alternativas educadas quando cabíveis.

As folhas usam paginação medida em A4, com margens de 14 mm. Os caracteres
selecionados ficam agrupados por família, sem reservar espaços para os demais.
Cada linha de escrita e cada exercício permanecem inteiros; as continuações
repetem apenas um cabeçalho curto. Os quadrados têm cerca de 20 mm, com guias
tracejadas, sem degradês. Páginas extras de repetição são opcionais e vêm
desativadas inicialmente. A tela abre nas cinco vogais do hiragana; o seletor
de família permite seguir KA, GA, SA, ZA e as demais, com uma família por folha.
A seleção de caracteres mostra apenas a família escolhida até a pessoa optar
pela seleção livre.

No livro, cada etapa começa em uma nova folha e suas lições seguem em sequência.
Na prática de hiragana e katakana do livro e nas folhas avulsas, cada família ocupa sua própria
folha, com todos os seus caracteres juntos. A ordem é: vogais, KA, GA, SA, ZA,
TA, DA, NA, HA, BA, PA, MA, YA, RA e WA/WO/N. Assim, as famílias com dakuten
e handakuten aparecem logo depois da família-base. A seleção livre das folhas
avulsas continua disponível, mantendo famílias diferentes em folhas separadas.
No livro, a apresentação e a escrita ficam intercaladas: conhecer as vogais,
escrever as vogais; conhecer KA/GA, escrever KA e GA; conhecer SA/ZA, escrever
SA e ZA, e assim por diante, nos dois silabários. `book-kana.js` adapta as seções
do currículo para essa sequência. Cada seção indica suas famílias de prática;
o gerador reúne o exemplo de cada família e seus blocos de escrita na mesma
folha. As famílias com marcas apresentam seu próprio exemplo acima dos blocos.
Não há mais uma página separada apenas para apresentar cada grupo.
O sumário aponta para a primeira explicação de cada etapa.
São sete etapas em kana, com 36 lições adaptadas do currículo. As lições de uma
família de kana por vez (`h-ka`, `k-sata` etc.) existem só no curso online: o livro
já intercala todas as famílias e as ignora (`ONLINE_ONLY` em `book-content.js`). Exemplos,
instruções, alternativas e gabaritos usam hiragana e katakana, com leituras
provenientes do conteúdo. O módulo de kanji do curso online é substituído no
livro por uma introdução final a dez caracteres: 一・二・三・人・日・月・山・川・木・水.
Essa parte vem depois das atividades, das páginas extras e dos gabaritos, mesmo
quando o gabarito está desativado. As leituras e os significados introdutórios
acompanham os modelos de traços; palavras compostas e kanji avançados ficam fora
do volume. O currículo online continua completo.

Cabeçalhos, objetivos e quadros usam verde, coral, violeta, azul e dourado, com
fundos claros e áreas de resposta brancas. As cores se mantêm no PDF e não
dependem do tema da interface.
O seletor de cor atende ao livro e a todas as atividades. A opção preto e branco
usa texto escuro, superfícies brancas, contornos reforçados e ilustrações em
cinza com contraste ajustado. Modelos de traços ficam escuros; os dois modelos
para cobrir ficam em cinza médio, distintos das guias pontilhadas mais claras.
A prévia usa o mesmo estilo aplicado à impressão e ao PDF.

As explicações iniciais do impresso têm versões concisas em `book-notes.js`.
Os exemplos permanecem completos e aparecem em cartões: caracteres isolados
em 44 pt (36 pt quando compartilham a folha com a escrita), palavras em 25 pt e
frases em 18 pt. Ilustrações do acervo acompanham
palavras reconhecidas, sem associar desenhos a fragmentos de outras palavras.
Cada família de escrita começa com kana grandes; a seção final
apresenta os kanji em 54 pt, com desenhos do significado e modelos de traços.
Esses desenhos são apoio de memória, não explicações da origem dos caracteres.
Os cartões podem seguir para a próxima folha sem reduzir a escala de impressão.

Títulos acompanham a primeira explicação, e o sumário recebe os números reais
após a paginação. Não se esticam exercícios para preencher a página: o espaço
de resposta depende da tarefa. Atividades de imagens incluem recuperação de
palavras de memória; diálogos incluem produção de duas falas. Gabaritos são
separados e opcionais, com respostas curtas de palavras, frases e partículas em
duas colunas. O aluno pode esconder os modelos de palavras e frases para
praticar a lembrança.

Os testes em `tests/e2e/print.spec.js` conferem conteúdo completo, seleção de
caracteres, quadrados, rodapés, sumário e correspondência entre folhas da prévia
e páginas do PDF, incluindo os dois temas e a prévia em celular.
Também verificam a ausência de kanji antes da seção final e a lista restrita
de caracteres nessa seção, com e sem gabaritos, além da preservação de todos os
exemplos, do carregamento das ilustrações e do tamanho dos caracteres destacados.

Pronúncias novas entram automaticamente no catálogo textual quando fazem parte
dos exemplos. Para caracteres ou palavras com leitura ambígua, informe a leitura
ensinada. A API sintetiza apenas a solicitação do aluno: não há geração em lote
nem arquivos de áudio no projeto.


## Diagnóstico, contexto e novos rascunhos

O diagnóstico contém 15 perguntas em shared/placement.js. O reconhecimento de
hiragana e katakana funciona como pré-requisito para sugestões posteriores;
kanji, vocabulário, partículas e leitura refinam a indicação. O resultado sugere
uma unidade e abre as anteriores; não certifica proficiência. A resposta “Ainda não sei” é válida e não
altera revisão, XP, constância ou lições concluídas. A sugestão é reversível.

shared/discovery.js reúne oito cápsulas culturais e três trilhas temáticas.
As cápsulas reutilizam contexto e explicações de expressões existentes. As trilhas
combinam IDs reais de palavras, modelos de frases, expressões e lições; não mantêm
cópias concorrentes do conteúdo.

Para começar uma lição, execute:

    npm run content:new -- --id novo-tema --module everyday --title "Novo tema"

O rascunho aparece em docs/drafts, com todos os campos e marcações REVISAR.
O comando recusa IDs duplicados e nunca sobrescreve um arquivo. Complete o texto,
confira [o checklist editorial](EDITORIAL-CHECKLIST.md), remova metadados do rascunho
e só então integre a lição em shared/lessons e curriculum.js. O backlog registra
os blocos posteriores sem apresentá-los como conteúdo já disponível ao aluno.
