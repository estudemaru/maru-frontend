# Ilustrações do Irasutoya no Maru

Autor e direitos: Mifune Takashi / [Irasutoya](https://www.irasutoya.com/).

Em 24/09/2026, a responsável pelo Maru informou autorização recebida por e-mail
para utilizar mais de 20 ilustrações no projeto educacional gratuito, sem
conteúdo pago nem finalidade de lucro. O antigo teto interno de 20 foi retirado
para esse uso. A correspondência fica guardada pela responsável, fora do
repositório, sem divulgar dados pessoais.

Esse registro não transfere direitos sobre as imagens nem constitui uma licença
irrestrita para outros projetos. Novos usos devem respeitar o contexto autorizado,
os [termos](https://www.irasutoya.com/p/terms.html) e a
[FAQ](https://www.irasutoya.com/p/faq.html). Não oferecer as artes como pacote de
downloads. O site não solicita apoio financeiro.

O Livro 1 reutiliza essas imagens nos exemplos das lições e nas atividades de
vocabulário, associadas às respectivas palavras. As páginas ilustradas mantêm
o crédito a Mifune Takashi / Irasutoya no rodapé. Os desenhos esquemáticos dos
significados na seção final de kanji são vetores próprios do projeto.

As lições na tela reutilizam os objetos nos exemplos de vocabulário e cenas
individuais na abertura, leitura, prática e conclusão. As cenas são exibidas
inteiras, sem montagem ou redesenho; as cenas foram apenas reduzidas para
440 px, preservando a transparência. Cada tela da lição mantém o crédito do
artista. As perguntas usam uma cena de estudo sem letras legíveis; as poses de
reflexão e descoberta aparecem somente depois da resposta.

| Arquivo local | Uso | Página oficial |
| --- | --- | --- |
| `irasutoya-study-nihongo.webp` | Capa do Livro 1 | https://www.irasutoya.com/2015/08/blog-post_26.html |
| `irasutoya-teacher.webp` | Página para professores; cena individual, sem montagem | https://www.irasutoya.com/2020/06/blog-post_798.html |
| `irasutoya-water.webp` | Associação de imagem e palavra: água | https://www.irasutoya.com/2012/11/blog-post_954.html |
| `irasutoya-bread.webp` | Associação de imagem e palavra: pão | https://www.irasutoya.com/2019/08/blog-post_66.html |
| `irasutoya-rice.webp` | Associação de imagem e palavra: arroz | https://www.irasutoya.com/2014/11/blog-post_133.html |
| `irasutoya-apple.webp` | Associação de imagem e palavra: maçã | https://www.irasutoya.com/2014/10/blog-post_766.html |
| `irasutoya-fish.webp` | Associação de imagem e palavra: peixe | https://www.irasutoya.com/2016/03/blog-post_962.html |
| `irasutoya-egg.webp` | Associação de imagem e palavra: ovo | https://www.irasutoya.com/2013/09/blog-post_5250.html |
| `irasutoya-cat.webp` | Associação de imagem e palavra: gato; mnemônico de hiragana | https://www.irasutoya.com/2018/12/blog-post_505.html |
| `irasutoya-dog.webp` | Associação de imagem e palavra: cachorro; mnemônico de hiragana | https://www.irasutoya.com/2014/08/blog-post_69.html |
| `irasutoya-book.webp` | Associação de imagem e palavra: livro | https://www.irasutoya.com/2016/03/blog-post_42.html |
| `irasutoya-tree.webp` | Associação de imagem e palavra: árvore | https://www.irasutoya.com/2013/07/blog-post_8128.html |
| `irasutoya-coffee.webp` | Associação de imagem e palavra: café; mnemônico de katakana | https://www.irasutoya.com/2016/05/blog-post_350.html |
| `irasutoya-cake.webp` | Associação de imagem e palavra: bolo; mnemônico de katakana | https://www.irasutoya.com/2019/09/blog-post_32.html |
| `irasutoya-umbrella.webp` | Associação de imagem e palavra: guarda-chuva | https://www.irasutoya.com/2020/09/blog-post_737.html |
| `irasutoya-train.webp` | Associação de imagem e palavra: trem | https://www.irasutoya.com/2013/04/blog-post_3537.html |
| `irasutoya-lesson-study.webp` | Personagem estudando; abertura, leitura, perguntas e jogo | https://www.irasutoya.com/2013/04/blog-post_3826.html |
| `irasutoya-lesson-cafe.webp` | Cena de conversa no café nas lições com café ou bolo | https://www.irasutoya.com/2018/08/blog-post_165.html |
| `irasutoya-lesson-think.webp` | Personagem refletindo depois de uma resposta incorreta | https://www.irasutoya.com/2015/03/blog-post_644.html |
| `irasutoya-lesson-idea.webp` | Personagem com uma descoberta depois de uma resposta correta | https://www.irasutoya.com/2015/03/blog-post_644.html |
| `irasutoya-lesson-celebrate.webp` | Cena de comemoração na conclusão da lição | https://www.irasutoya.com/2018/06/blog-post_62.html |

Adicionar cada nova ilustração a este inventário e manter os créditos nos
materiais impressos. Os testes verificam a presença de uma fonte para cada
arquivo local; não há mais uma validação de quantidade máxima.

## Formato dos arquivos

As artes ficam em WebP com transparência (cerca de 10% do tamanho dos PNGs
originais, sem diferença visível). Para incluir uma nova ilustração, converta o
PNG baixado com:

```bash
cwebp -q 85 -m 6 -alpha_q 100 -sharp_yuv irasutoya-nome.png -o irasutoya-nome.webp
```

Mantenha pelo menos 400 px no maior lado, para a impressão continuar nítida.
