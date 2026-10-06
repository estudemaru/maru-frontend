# Trilha do zero ao N5 · plano de reestruturação

Versão 2.1, de 05/10/2026. É a especificação da nova trilha. A fase 1 (esqueleto,
bloqueio e checkpoints) está implementada; as fases 2 a 4, não. O documento mostra como a trilha atual (9 etapas, 57 lições) se
encaixa no novo esqueleto de 15 unidades, o que falta escrever e em que ordem.

**O que mudou na 2.1, com os ajustes finos da segunda revisão:**
- A aula 3.4 virou duas: perguntar com か e responder com はい/いいえ; depois,
  confirmar e negar. A linha principal passa a ter 86 aulas.
- A 5.6 separa o núcleo do katakana dos sons estrangeiros, que ficam fora do
  checkpoint.
- O checkpoint da forma て passa a cobrir tudo o que a unidade ensina.
- Checkpoints:
  - a nota de corte fica em 80%, e nenhum conceito crítico pode ficar zerado;
  - todo checkpoint termina com uma missão.
- Metadados: objetivo comunicativo e avisos para gramática ou kanji demais numa aula.
- O checklist ganhou mais três regras.

**O que mudou na versão 2, depois da primeira revisão:**
- O katakana subiu da unidade 8 para a 5.
- As aulas pequenas demais foram juntadas: de 109 para 85.
- こっち, そっち, あっち e どっち foram para os extras.
- Entraram as expressões prontas com verbo antes da unidade de verbos.
- O checklist ganhou três regras.
- Os estados de domínio ficaram mais simples.

## Princípios

- **Cada unidade ensina uma capacidade concreta.** A gramática entra como
  ferramenta: “Onde as coisas estão?”, não “Partícula に”.
- **Granularidade em três níveis:**
  - *conceito novo* vira aula;
  - *variação previsível* (o negativo de algo já visto, へ ao lado de に) entra
    como parte de uma aula;
  - *uso e revisão* (これもほんです depois de も) viram exercício, não aula.
  
  “Uma ideia por aula” não pode virar “uma microcoisa por tela”.
- **Só se usa o que já foi ensinado.** Há duas exceções controladas: palavras-imagem
  em katakana nas unidades 3 e 4, e expressões prontas (veja abaixo).
- **Regra antes da exceção.** Primeiro よん; depois “四 também pode ser し”.
- **Sequência em tudo:** ver → entender → reconhecer → montar → produzir → reutilizar.
- **Romaji sai aos poucos.** Depois do checkpoint de hiragana, ele fica escondido
  por padrão, com um botão “Mostrar leitura”.
- **Progressão que se sente.** Cada aula termina com algo novo que a pessoa
  consegue dizer: “agora eu consigo perguntar onde fica a estação”.

## Decisões

| Tema | Decisão | O que muda |
| --- | --- | --- |
| Ordem | A unidade seguinte só abre depois do checkpoint da anterior. | Substitui a regra atual “progressão recomendada, sem bloqueios” (`CONTENT.md`, comentário de `curriculum.js`). |
| Katakana | Unidade 5, logo depois de “Coisas ao meu redor”. | Só as unidades 3 e 4 precisam evitar katakana. *Mudou na v2, após a revisão; na v1 era a unidade 8.* |
| Revisão | Continua o FSRS (mesmo algoritmo do Anki). | Na tela, vira “🌱 Revisão rápida”, sem mostrar intervalos. |

### Bloqueio e checkpoints

- **Checkpoint em toda unidade de 1 a 14.** Uma prova curta, de 8 a 12 itens, com
  o que a unidade ensinou: reconhecer, montar, ouvir e produzir. A unidade 0 é só
  orientação, então a 1 abre quando as aulas da 0 forem lidas.
- **Para passar: 80% de acerto, e nenhum conceito crítico zerado.**
  - Cada item do checkpoint diz qual conceito testa. A unidade marca como críticos
    os conceitos de que a próxima depende (na 8, a localização com に).
  - Cada conceito crítico tem pelo menos duas questões, para que um deslize só não
    reprove.
  - Errou tudo de um conceito comum? A pessoa passa e lê “Você passou, mas vale
    revisar に”.
  - Errou tudo de um conceito crítico? Ela vê “Quase lá: revise a localização com
    に”, com o link da aula.
  - Em todos os casos, ela tenta de novo na hora, e errar não apaga nada. Os erros
    aparecem no resultado, com o link da aula; levá-los para a revisão do FSRS fica
    para a fase 4.
- **Todo checkpoint termina com uma missão.** É uma tarefa comunicativa, não uma
  pergunta de prova. Exemplo da unidade 8: “Você está numa sala. Diga onde estão o
  livro, a bolsa e o gato.” Na fase 1, os checkpoints usam só as perguntas que já
  existem. As missões são escritas na fase 3, junto com o conteúdo de cada unidade,
  e passam pela revisão humana.
- **Quem já sabe japonês pula pelo diagnóstico.** O resultado libera as unidades
  até a sugerida, como se os checkpoints tivessem sido feitos.
- **Ninguém perde acesso.** Quem já concluiu uma lição de uma unidade continua com
  ela aberta.
- **Arcade, revisão, consulta, folhas e extras continuam livres.** Só as aulas da
  trilha seguem a ordem.
- O progresso ganha o campo `checkpoints`, com data e nota. Como
  `shared/progress.js` também roda no backend, isso exige publicar a Edge Function.

### Katakana na unidade 5

- **Palavras-imagem, só nas unidades 3 e 4.** Uma palavra em katakana (ブラジル,
  um nome como マリア) só aparece:
  - com leitura em hiragana e romaji;
  - com a etiqueta “katakana: você aprende a ler na unidade 5”;
  - no máximo duas por aula;
  - nunca como item a ser lido num exercício.
  
  Na unidade 5, elas voltam como revisão.
- **Objetos do dia a dia em katakana** (スマホ, ペン, ノート) ficam para a prática
  da unidade 5, em vez de virarem けいたい ou えんぴつ só para fugir do katakana.
- **A regra dos kanji não muda.** Hoje eles só aparecem depois de hiragana **e**
  katakana (`core/beginner.js`). Como os kanji estreiam na unidade 6 (一〜十),
  depois do katakana, a regra atual já serve.
- **O diagnóstico também não muda** no que diz respeito ao katakana como pré-requisito.

### Expressões prontas

Algumas frases com verbo aparecem antes da unidade 9, como blocos fixos, sem
explicar a conjugação:
- しちじにおきます, na unidade de tempo;
- がっこうにいきます, na de lugares.

Cumprimentos como ありがとうございます e よろしくおねがいします funcionam do mesmo
jeito desde a unidade 3.

**Regras:**
- No máximo duas expressões novas por unidade.
- Sempre com tradução.
- Nunca no centro do exercício.

Na unidade 9, a aula de ます revela: “você já viu おきます e いきます; agora vamos
entender como os verbos funcionam”. O teste de dependências trata uma expressão
pronta como liberada **só naquela forma exata**; usar outra conjugação do verbo
antes da unidade 9 continua sendo erro.

## Visão geral

| Grupo | Unidades |
| --- | --- |
| 🌱 Primeiro contato | 0 Começando do zero · 1 Hiragana · 2 Hiragana avançado |
| 🐣 Eu consigo falar! | 3 はじめまして · 4 Coisas ao meu redor |
| ✨ Ler o mundo real | 5 Katakana |
| 🔢 Informação do dia a dia | 6 Números · 7 Tempo |
| 🌸 Onde estou? | 8 Lugares e localização |
| 🍚 Minha rotina | 9 Verbos e rotina |
| 🍵 Falar mais | 10 Descrição · 11 Gostos · 12 Passado |
| 🗾 Japonês funcional | 13 Quantidades · 14 Forma て |
| 🎌 Consolidação N5 | Leitura, escuta, kanji, vocabulário, gramática, diálogos e mini-simulados |
| Extras (fora da linha) | Gramática para curiosos, kanji como sistema e “Além dos livros” (com こっち/そっち/あっち/どっち) |

**Em números:**
- A linha principal fica com 86 aulas.
- **47 já existem.** 11 delas precisam ser divididas, porque hoje ensinam duas a
  quatro coisas de uma vez.
- **39 são novas.** 18 saem de partes de lições atuais, e 21 são conteúdo
  inteiramente novo.
- Somam-se 14 checkpoints e a consolidação N5.
- As outras 10 lições atuais viram Extras.

**Legenda:**

| Marca | Significado |
| --- | --- |
| ✅ | Existe; só muda de lugar. |
| ✏️ | Existe; precisa de um ajuste. |
| ✂️ | Divisão: a lição atual fica com o ID e com uma ideia; as outras viram aulas novas. |
| 🆕 | Escrever do zero. |
| 🧪 | Checkpoint. |
| 🧩 | Expressão pronta. |
| ➕ | Acréscimo que não estava na proposta original. |

## Mapa por unidade

### 0 · Começando do zero

Ao terminar, você sabe como o japonês é escrito e como estudar.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 0.1 | Sistemas de escrita: hiragana, katakana, kanji e romaji, só o mapa | ✅ `welcome` |
| 0.2 | Sons e vogais; a regularidade do japonês | ✅ `sounds` |
| 0.3 | Pronúncia básica: ら, ふ, し, ち, つ, sem fonética pesada | 🆕 |
| 0.4 | Como estudar sem se perder | ✅ `start-study` ➕ |

### 1 · Hiragana

Ao terminar, você lê palavras simples em hiragana sem romaji.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 1.1–1.4 | あ, か, さ, た | ✅ `h-vowels`, `h-ka`, `h-sa`, `h-ta` |
| 1.5 | な e a pergunta なに？ | ✏️ `h-na`: acrescentar なに？ |
| 1.6 | は (com o aviso de que ele terá outra pronúncia) | ✅ `h-ha` |
| 1.7 | Revisão de K a H | ✅ `h-rows` |
| 1.8 | ま | ✅ `h-ma` |
| 1.9 | や e ら (sem yi e ye) | ✅ `h-yara`: Y tem só três letras; fica inteira |
| 1.10 | わ, を, ん | ✅ `h-rest` |
| 🧪 | 46 hiragana, som ↔ letra, palavras simples | 🆕 |

### 2 · Hiragana avançado

Ao terminar, você lê palavras com ゛, ゃ, っ e vogais longas.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 2.1 | ゛ e ゜ | ✅ `h-dakuten`: as duas marcas são uma ideia só |
| 2.2 | ゃゅょ pequenos (きや × きゃ) | ✂️ `h-combinations` fica só com ゃゅょ |
| 2.3 | Duração: っ (がっこう) e vogais longas (おばあさん) | ✂️ nova, com a outra parte de `h-combinations` |
| 2.4 | Lendo palavras de verdade | ✅ `h-words` |
| 2.5 | Uma cena só em hiragana | ✅ `h-dialogue` |
| 🧪 | Frases curtas (わたしはまりあです), com aviso sobre は | 🆕 |

### 3 · はじめまして

Ao terminar, você se apresenta e pergunta de onde a pessoa é.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 3.1 | Cumprimentos (🧩 よろしくおねがいします) | ✅ `greetings` (vem da unidade 0) |
| 3.2 | A は B です | ✏️ `sentence-identity`: ブラジル vira palavra-imagem |
| 3.3 | は como partícula (lida wa) | ✂️ `particle-topic` fica só com は |
| 3.4 | Perguntar com か e responder com はい/いいえ | ✂️ `sentence-question` fica com か e ganha いいえ |
| 3.5 | Confirmar e negar: そうです, ちがいます, じゃないです | ✂️ nova, com a parte de じゃないです de `sentence-question`; そうです e ちがいます são novos |
| 3.6 | Nacionalidades: にほんじん; ブラジルじん como palavra-imagem | 🆕 |
| 3.7 | の: posse e relação | ✂️ `particle-connect` fica só com の |
| 3.8 | も (わたしもがくせいです) | ✂️ nova, com a parte de も de `particle-topic` |
| 🧪 | Missão: apresentar-se | 🆕 |

### 4 · Coisas ao meu redor

Ao terminar, você pergunta o que algo é e de quem é.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 4.1 | これ, それ, あれ, どれ e これはなんですか | ✂️ `num-pointing` fica com esta série e ganha なん |
| 4.2 | この, その, あの + substantivo | ✂️ nova, com a parte de この de `num-pointing` |
| 4.3 | だれ (これはだれのほんですか) | 🆕 |
| 4.4 | Objetos: ほん, かばん, かぎ, つくえ, いす, かさ (com も aplicado como exercício) | 🆕 |
| 🧪 | Objetos, これ/この, なん e だれ | 🆕 |

### 5 · Katakana

Ao terminar, você lê cardápios, lojas e palavras de fora.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 5.1 | アイウエオ e カ a コ | ✅ `k-basics` |
| 5.2 | サ a ソ e タ a ト | ✅ `k-sata` |
| 5.3 | ナ a ノ e ハ a ホ | ✅ `k-naha` |
| 5.4 | マ a ン | ✅ `k-mawa` |
| 5.5 | シ × ツ, ソ × ン | ✅ `k-lookalikes` |
| 5.6 | Núcleo: ゛ e ゜ (ガ, パ), ャュョ, ッ e ー. Extensão, no fim da aula: sons de fora (ファ, ティ, ウィ) | ✏️ `k-long`: ganha uma parte sobre ゛, ゜ e ャュョ; os sons de fora passam para o fim |
| 5.7 | Katakana no mundo real, com スマホ, ペン, ノート e コンビニ | ✏️ `k-real-words`: acrescentar os objetos e lugares das unidades 4 e 8 |
| 5.8 | Cena: pedir um café | ✅ `k-dialogue` |
| 🧪 | O núcleo do katakana e as palavras-imagem das unidades 3 e 4 | 🆕 |

Hoje, ゛ e ゜ do katakana só aparecem dentro de palavras (パン, テレビ). ャュョ é
citado numa dica, mas não tem explicação própria. Por isso a 5.6 ganha a parte
nova. Os sons de fora são úteis, mas não definem quem domina o katakana básico:
eles ficam fora do checkpoint e voltam como exercício nas cenas.

### 6 · Números e informação pessoal

Ao terminar, você diz sua idade, um telefone e um preço.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 6.1 | 1 a 10 com 一〜十; よん, なな e きゅう primeiro | ✅ `kanji-numbers` |
| 6.2 | De 11 a 10.000 como blocos de montar, com as mudanças de som | ✅ `num-count` |
| 6.3 | Idade: さい, はたち, なんさいですか | 🆕 |
| 6.4 | Telefone: números um a um, ゼロ/れい | 🆕 |
| 6.5 | Preços: 円, いくらですか | ✏️ `daily-numbers` vira “Quanto custa?” (horas e contadores saem) |
| 🧪 | Números, idade, telefone e preço | 🆕 |

### 7 · Tempo

Ao terminar, você diz quando algo acontece.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 7.1 | Horas (よじ, しちじ, くじ), なんじですか, ごぜん/ごご; 🧩 しちじにおきます | ✂️ `num-time` fica sem os minutos |
| 7.2 | Minutos: ふん e ぷん | ✂️ nova, com a parte de minutos de `num-time` |
| 7.3 | Dias da semana e hoje, amanhã e ontem (os primeiros kanji: 月火水木金土日) | ✅ `num-week` |
| 7.4 | Meses e dias do mês | ✅ `num-dates` ➕ |
| 🧪 | Horas, minutos, dias e datas | 🆕 |

`kanji-nature` (日 月 山 川 水 木) vai para os extras: os kanji dos dias já entram na 7.3.

### 8 · Lugares e localização

Ao terminar, você pergunta e diz onde as coisas e as pessoas estão.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 8.1 | ここ, そこ, あそこ, どこ (トイレはどこですか) | ✅ `daily-find` |
| 8.2 | Lugares: がっこう, うち, えき, びょういん, コンビニ, レストラン, ホテル; 🧩 がっこうにいきます | 🆕 |
| 8.3 | Existir: Xがあります (coisas) e Xがいます (pessoas e bichos) | ✂️ `particle-existence` fica com あります e います |
| 8.4 | に: onde algo está (つくえのうえにほんがあります) | ✂️ nova, com a parte de に de `particle-existence` |
| 8.5 | Posições: 上 下 中 前 後ろ 隣 近く, e ほんはどこですか | 🆕 |
| 8.6 | O jeito educado: こちら, そちら, あちら, どちら | ✂️ nova, com a parte educada de `num-pointing` ➕ |
| 🧪 | Missão: “Você está numa sala. Diga onde estão o livro, a bolsa e o gato.” Conceito crítico: に | 🆕 |

O が entra aqui, limitado a “o que existe”; na unidade 11, ganha o uso de
preferência. A parte de で de `particle-existence` vai para a 9.4.

### 9 · Verbos e rotina

Ao terminar, você conta o que faz no dia, onde e com quem.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 9.1 | Verbos e ～ます (たべます, のみます, いきます, おきます); dicionário × ます | 🆕 (aproveita a parte de verbo de `start-language`) |
| 9.2 | を (ごはんをたべます) | ✅ `sentence-actions` |
| 9.3 | Para onde: に e へ (へ escrito he, lido e) | ✂️ nova, com as partes de に e へ de `particle-place` |
| 9.4 | で: onde a ação acontece, e a comparação に × で | ✂️ `particle-place` fica com で |
| 9.5 | と: com alguém | ✂️ nova, com a parte de と de `particle-connect` |
| 9.6 | Negativo: ません | ✂️ nova, com a parte de ません de `sentence-time` |
| 9.7 | Rotina com horário: しちじにおきます, はちじにがっこうにいきます | 🆕 |
| 9.8 | Pedidos: をください | ✅ `daily-order` |
| 9.9 | Quando faltar uma palavra | ✅ `daily-help` |
| 9.10 | Uma conversa em pequenos turnos | ✅ `daily-dialogue` |
| 🧪 | Rotina com を, に, で, と e ません | 🆕 |

### 10 · Descrição

Ao terminar, você descreve pessoas, coisas e lugares.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 10.1 | Adjetivos い no fim da frase (たかいです) | ✂️ `sentence-describe` fica com os de い |
| 10.2 | Adjetivos な no fim da frase (しずかです) | ✂️ nova |
| 10.3 | Antes do substantivo: かわいいねこ, きれいなまち | ✂️ nova, com a parte “antes de um substantivo” de `sentence-describe` |
| 10.4 | Negativo: たかくないです, しずかじゃないです | ✂️ nova, com a parte de negativo de `sentence-describe` |
| 🧪 | Descrever pessoas, coisas e lugares | 🆕 |

### 11 · Gostos

Ao terminar, você diz do que gosta e pergunta preferências.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 11.1 | すき e きらい, e が de preferência (なにがすきですか) | 🆕 |
| 11.2 | とても e あまり (あまりすきじゃないです) | 🆕 |
| 11.3 | ね e よ no fim da frase | ✂️ nova, com a parte de ね e よ de `particle-connect` ➕ |
| 🧪 | Falar de gostos e reagir | 🆕 |

### 12 · Passado

Ao terminar, você conta o que aconteceu.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 12.1 | でした e じゃありませんでした | 🆕 |
| 12.2 | ました e ませんでした (きのう、レストランでたべました) | ✂️ `sentence-time` fica com o passado |
| 12.3 | Adjetivos no passado: たかかったです, しずかでした | 🆕 |
| 🧪 | Contar o que aconteceu | 🆕 |

### 13 · Quantidades

Ao terminar, você conta coisas, pessoas e objetos.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 13.1 | ひとつ… とお, いくつ | ✂️ `num-counters` fica com つ |
| 13.2 | Pessoas: ひとり, ふたり, さんにん, よにん, なんにん | ✂️ nova, com a parte de 人 |
| 13.3 | Pequenos e compridos: 個 e 本 | ✂️ nova (本 vem de `num-counters`; 個 é novo) |
| 13.4 | Livros e coisas finas: 冊 e 枚 | ✂️ nova (枚 vem de `num-counters`; 冊 é novo) |
| 13.5 | Bichos pequenos: 匹 | ✂️ nova, com a parte de 匹 |
| 🧪 | Contar e perguntar quantos | 🆕 |

### 14 · Forma て

Ao terminar, você pede, encadeia ações e diz o que pode e o que não pode.

| Aula | Conteúdo | Situação |
| --- | --- | --- |
| 14.1 | O que é a forma て; grupo 2 (たべる → たべて) | 🆕 |
| 14.2 | Grupo 1: って, んで, いて, いで, して | 🆕 |
| 14.3 | Irregulares: する, くる, いく → いって | 🆕 |
| 14.4 | ～てください | 🆕 |
| 14.5 | Sequência: たべて、いきます | 🆕 |
| 14.6 | ～ています | 🆕 |
| 14.7 | Pode e não pode: ～てもいいです, ～てはいけません | 🆕 |
| 🧪 | Formar a て dos três grupos (conceito crítico), てください, sequência, ています, てもいいです e てはいけません | 🆕 |

A formação da forma て é o conceito crítico deste checkpoint. Quem avança sem
dominá-la tropeça em quase tudo o que vem depois do N5.

### Consolidação N5

Simulados por área (leitura, escuta, vocabulário, gramática, kanji e diálogos),
montados com os itens de todas as unidades e agendados pelo FSRS. É um modo de
prova, não uma unidade com aulas. 🆕

### Extras, fora da linha principal

Abertos sempre, sem checkpoint:

- **Gramática para curiosos:** `how-it-works` e `start-language`.
- **Kanji como sistema:** `kanji-meaning`, `kanji-parts` e `kanji-nature`.
- **Além dos livros:** `casual-register`, `casual-slang`, `casual-culture`,
  `casual-short` (✏️ ganha こっち, そっち, あっち, どっち, que saem de
  `num-pointing`) e `casual-communities`.

## Kanji dentro da trilha

Não há mais uma etapa só de kanji. Cada kanji entra dentro de palavras, na
unidade que dá contexto a ele:

| Unidade | Kanji |
| --- | --- |
| 6 | 一 a 十, 百, 千, 万, 円 |
| 7 | 日 月 火 水 木 金 土, 時 分 半 |
| 8 | 上 下 中 |
| 9 em diante | 人, 学, 生, 先 |

Ensina-se a palavra (日本, 日曜日, 毎日), nunca a lista de leituras do caractere.

## Sistemas que mudam

| Sistema | Como fica | Base atual |
| --- | --- | --- |
| Checkpoints e bloqueio | Tela de prova por unidade, 80% sem conceito crítico zerado, missão final, liberação pelo diagnóstico, regra para quem já tem progresso | `learningPath.js` já marca pré-requisitos (`recommendedAfter`) sem bloquear |
| Estrutura da aula | contexto → conceito → exemplo → explicação → reconhecer → associar → montar → produzir → ouvir → revisar | Hoje: abertura → partes → resumo → perguntas → jogo. Faltam montar, produzir e ouvir dentro da aula |
| Exercícios novos | Montar frase com blocos, completar a lacuna, achar o erro, ouvir e escolher, mini diálogo, tradução livre | Já existem múltipla escolha, karuta, leitura, digitação e frases guiadas. “Monte a frase” estava previsto em `ARCHITECTURE.md` (Pointer Events, sem React) |
| Estados de domínio | ○ Novo (ainda não estudado) · ◔ Aprendendo (já viu, ainda erra) · ◑ Familiar (reconhece com constância) · ● Dominado (produz e a revisão está estável) | Calculados com o FSRS e as habilidades que as chaves de revisão já separam (`:read`, `:find`, `:write`); ● exige acerto em produção com estabilidade de algumas semanas |
| Romaji | Escondido por padrão depois do checkpoint 1, com botão “Mostrar leitura” | A preferência de romaji já existe em Meu ritmo |
| Teste de dependências | Cada aula declara o que introduz, o que usa e as expressões prontas; o build falha se uma aula usar algo de uma aula posterior ou passar de 8 palavras novas | Novo. Exemplo abaixo |
| Objetivo da aula | Escrito como capacidade: “perguntar onde algo está”. Abre a aula (“Nesta aula você vai aprender a…”) e fecha a conclusão (“✓ Agora você consegue…”) | O campo `goal` já existe e já aparece nas duas telas, mas hoje descreve conteúdo (“Fazer perguntas com か e negar com じゃないです”) |

### Exemplo de metadados

```js
l("num-time", "Que horas são?", 6,
  "Perguntar e dizer que horas são",   // goal: o objetivo comunicativo
  …, {
  introduces: ["vocab:ji", "vocab:han", "vocab:gozen", "vocab:gogo", "grammar:nanji"],
  uses: ["grammar:desu", "grammar:ka", "kanji:numbers"],
  chunks: ["shichiji-ni-okimasu"]
})
```

O objetivo comunicativo reaproveita o `goal`, sem campo novo.

O teste percorre a trilha na ordem e **falha** se:
- algo de `uses` não tiver sido introduzido antes;
- uma aula introduzir mais de 8 itens `vocab:`;
- uma expressão de `chunks` aparecer numa forma diferente antes da unidade 9.

E **avisa**, sem falhar, se uma aula introduzir:
- mais de um item `grammar:`;
- mais de cinco `kanji:`.

Os avisos ficam como avisos porque algumas aulas juntam variações previsíveis de
propósito, como に e へ na 9.3, ou てもいいです e てはいけません na 14.7.

Como complemento, um varredor procura marcas no texto dos exemplos (ています,
てください, で, へ) para pegar o que não foi declarado. Os metadados são escritos
à mão, então o teste garante a ordem, não a precisão da marcação.

## Checklist editorial

Regras que entram no `EDITORIAL-CHECKLIST.md`:

- [ ] A aula tem um objetivo comunicativo explícito: “Ao terminar, você consegue…”.
- [ ] A aula introduz um conceito novo; variações previsíveis entram nela, e usos
  viram exercício.
- [ ] No máximo 6 a 8 palavras novas por aula (o teste confere).
- [ ] Pelo menos 70% das palavras dos exemplos já foram vistas antes. Isso fica com a
  revisão humana: medir automaticamente exigiria marcar cada palavra de cada exemplo.
- [ ] Os exemplos usam só gramática e vocabulário anteriores, ou expressões prontas
  declaradas (o teste confere).
- [ ] Katakana antes da unidade 5 só como palavra-imagem: com leitura, etiqueta e no
  máximo duas por aula.
- [ ] A regra vem antes da exceção.
- [ ] A aula tem as etapas de reconhecer, montar e produzir.
- [ ] Nenhuma frase-exemplo existe só para demonstrar gramática: ela soa como algo
  que alguém realmente diria.
- [ ] Pelo menos um exercício exige entender o significado, não só reconhecer a
  forma escrita.
- [ ] A unidade termina com uma missão comunicativa.

## Ordem de execução

1. **Esqueleto e bloqueio, sem conteúdo novo em japonês.** Implementada em 05/10/2026
   (detalhes em `ARCHITECTURE.md`, “Unidades e checkpoints”).
   - Unidades em `curriculum.js`, com as lições atuais nos novos lugares (IDs mantidos).
   - Checkpoints provisórios, com perguntas das lições escolhidas à mão: uma lição
     que ainda mistura ideias só cede as perguntas da ideia da unidade. A 0 não tem
     checkpoint; 11, 12 e 14 ainda não têm aulas e não seguram a trilha. Onde as
     perguntas não chegavam a seis, entram itens do jogo de números ou o significado
     dos exemplos de uma lição que só trata da ideia da unidade.
   - Palavras-imagem nas unidades 3 e 4, de forma automática: a nota do exemplo dá a
     leitura em hiragana, e o jogo da lição deixa o katakana de fora. Os jogos também
     só usam cartas de lições da mesma unidade ou de unidades anteriores.
   - Liberação pelo diagnóstico e regra para quem já tem progresso.
   - Trilha com cadeados; testes e documentos atualizados.
   - As lições a dividir ficam inteiras por enquanto, na unidade da primeira ideia delas.
2. **Divisões.**
   - As 11 lições que ensinam várias coisas viram um conceito por aula. A original
     fica com o ID; quem já a concluiu ganha as partes como concluídas.
   - Cada lote passa pela sua revisão.
3. **Conteúdo novo, uma unidade por vez.** Ordem: 3 → 4 → 6 → 8 → 9 → 10 → 11 → 12
   → 13 → 14 → Consolidação N5. Cada unidade é um lote para revisar antes de publicar.
4. **Sistemas pedagógicos.**
   - Teste de dependências, de preferência antes da fase 3, para já validar o
     conteúdo novo.
   - Exercícios novos e estrutura de 10 passos.
   - Estados de domínio e romaji escondido.

As fases 1 e 4 são código. As fases 2 e 3 são, sobretudo, conteúdo em japonês, e o
ritmo delas é o da revisão humana.

## Decidido em 05/10/2026

- **“Quanto, quando e qual” não vira etapa.** As lições entram direto nas unidades 4,
  6, 7 e 13. A revisão do conteúdo delas continua necessária.
- **Livro 1 impresso:** fica como está nesta fase. Ele passa a seguir os temas
  (`THEMES`, as etapas antigas), e não as unidades.
- **Nota de corte:** 80%, sem conceito crítico zerado.
- **Lições divididas, para quem já concluiu a original:** as partes contam como
  concluídas, mas o checkpoint da unidade não. Exemplo: quem concluiu
  `particle-place` recebe a 9.3 e a 9.4, e a unidade 9 continua com o checkpoint
  pendente.

## Pendente

- **Nomes, cores e selos definitivos das 15 unidades.** Os atuais são funcionais e
  provisórios; as cores reaproveitam a paleta das etapas antigas.
