# Revisar antes de integrar conteúdo

- [ ] O objetivo descreve uma ação concreta que um iniciante consegue realizar.
- [ ] Os termos de gramática são explicados ou ligados ao glossário.
- [ ] Cada exemplo tem japonês, leitura, tradução e contexto quando necessário.
- [ ] A leitura de um kanji está associada à palavra, sem tratar uma leitura como universal.
- [ ] Vogais longas, っ e ゃゅょ estão escritos e explicados corretamente.
- [ ] A intenção da pergunta torna a resposta adequada; outras respostas possíveis não são chamadas de japonês incorreto.
- [ ] Distratores pertencem ao mesmo tipo e não contêm uma segunda resposta correta.
- [ ] Cada pergunta explica por que a resposta funciona.
- [ ] Gírias e expressões têm contexto e registro; traduções não são equivalências literais universais.
- [ ] Exemplos foram revisados por uma pessoa; rascunhos de IA não entram automaticamente na trilha.
- [ ] O ID é novo, estável e não substitui um ID já usado no progresso.
- [ ] Não há campos REVISAR, rascunhos ou contagens fictícias no conteúdo publicado.
- [ ] Links de prática apontam para rotas reais e o áudio está no catálogo textual.
- [ ] npm run check, npm test e o fluxo da lição no navegador foram conferidos.

## Trilha do zero ao N5

Regras de `TRILHA-N5.md` para as lições da linha principal. As marcadas com
"teste" serão conferidas pelo teste de dependências (fase 4); até lá, valem na
revisão.

- [ ] A lição tem um objetivo comunicativo, escrito no `goal`: “perguntar onde algo está”.
- [ ] A lição traz uma ideia nova; variações previsíveis entram nela, e usos viram exercício.
- [ ] No máximo 6 a 8 palavras novas (teste).
- [ ] Pelo menos 70% das palavras dos exemplos já apareceram antes na trilha.
- [ ] Os exemplos usam só gramática e vocabulário de lições anteriores, ou expressões prontas declaradas (teste).
- [ ] Nas unidades 3 e 4, katakana só como palavra-imagem: no máximo duas por lição e nunca como item a ser lido num exercício.
- [ ] A regra vem antes da exceção (primeiro よん; depois, “四 também pode ser し”).
- [ ] Nenhuma frase-exemplo existe só para demonstrar gramática: ela soa como algo que alguém diria.
- [ ] Pelo menos uma pergunta exige entender o significado, não só reconhecer a forma escrita.
- [ ] A unidade termina com uma missão comunicativa no checkpoint.
- [ ] O checkpoint só pergunta a ideia da própria unidade ou de uma anterior (`tests/trilha.test.js` confere a ordem das lições).

Um dia pequeno também conta: uma palavra revisada, uma explicação mais clara ou
uma ideia no backlog. Nenhuma cadência diária é exigida.
