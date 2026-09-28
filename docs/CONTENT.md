# Conteúdo e progressão didática

A trilha assume zero conhecimento de japonês. O aluno recebe explicação em
português antes dos exercícios; exemplos trazem japonês, leitura de apoio e
tradução. A progressão é recomendada, sem bloqueios artificiais.

| Etapa | Lições | Resultado esperado |
| --- | --- | --- |
| Primeiros passos | 5 | Reconhecer as escritas, perceber sons e cumprimentar. |
| Hiragana | 5 | Ler fileiras, marcas e combinações; iniciar escrita. |
| Katakana | 4 | Reconhecer empréstimos, formas parecidas e vogais longas. |
| Primeiros kanji | 4 | Relacionar significado, leitura em palavras e traços. |
| Construir frases | 5 | Apresentar-se, perguntar, negar e expressar ações. |
| Partículas | 4 | Identificar tópico, sujeito, objeto, lugar e relações. |
| Dia a dia | 5 | Pedir itens, encontrar lugares e pedir ajuda na conversa. |
| Além dos livros | 5 | Entender registro, gírias e expressões de comunidades. |

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
2. Inclua objetivo, duração, seções, exemplos e perguntas explicadas.
3. Defina o índice da resposta correta em cada pergunta.
4. Para prática complementar, informe uma rota existente e parâmetros.
5. A etapa em curriculum.js compõe índices, contagens e navegação.
6. Execute as verificações e teste leitura e prática.

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
selecionados seguem a ordem do silabário, sem reservar espaços para os demais.
Cada linha de escrita e cada exercício permanecem inteiros; as continuações
repetem apenas um cabeçalho curto. Os quadrados têm cerca de 20 mm, com guias
tracejadas, sem degradês. Páginas extras de repetição são opcionais e vêm
desativadas inicialmente.

No livro, cada etapa começa em uma nova folha e suas lições seguem em sequência.
Na prática de hiragana e katakana do livro, cada família ocupa sua própria
folha, com todos os seus caracteres juntos. A ordem é: vogais, KA, GA, SA, ZA,
TA, DA, NA, HA, BA, PA, MA, YA, RA e WA/WO/N. Assim, as famílias com dakuten
e handakuten aparecem logo depois da família-base. Essa organização é específica
do livro; a seleção livre das folhas avulsas continua disponível.
São sete etapas em kana, com 36 lições adaptadas do currículo. Exemplos,
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
de caracteres nessa seção, com e sem gabaritos.

Pronúncias novas entram automaticamente no catálogo textual quando fazem parte
dos exemplos. Para caracteres ou palavras com leitura ambígua, informe a leitura
ensinada. A API sintetiza apenas a solicitação do aluno: não há geração em lote
nem arquivos de áudio no projeto.


## Diagnóstico, contexto e novos rascunhos

O diagnóstico contém 15 perguntas em shared/placement.js. O reconhecimento de
hiragana e katakana funciona como pré-requisito para sugestões posteriores;
kanji, vocabulário, partículas e leitura refinam a indicação. O resultado sugere
uma etapa, não certifica proficiência. A resposta “Ainda não sei” é válida e não
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
