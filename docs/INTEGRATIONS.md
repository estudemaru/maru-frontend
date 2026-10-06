# APIs e créditos

## Pronúncia: TTS Quest / VOICEVOX

O Maru solicita a pronúncia quando o aluno toca no botão. O backend consulta
`https://api.tts.quest/v3/voicevox/synthesis`, com a leitura ensinada e `speaker=30`
(No.7, estilo アナウンス: voz adulta de locução, escolhida por soar neutra).
A resposta contém uma URL remota de streaming, reproduzida pelo navegador.
Nenhum modelo de voz, MP3 ou gerador local faz parte do projeto.

- Crédito da voz: **VOICEVOX:No.7**, obrigatório pelos termos do VOICEVOX.
- [Documentação do provedor](https://github.com/ts-klassen/ttsQuestV3Voicevox).
- [Modalidade pública sem chave](https://voicevox.su-shiki.com/su-shikiapis/ttsquest/).
- [Termos VOICEVOX](https://voicevox.hiroshiba.jp/term/).
- [Termos da voz No.7](https://voiceseven.com/#j0400): uso não comercial livre e
  sem pedido prévio, como o Maru gratuito e sem anúncios. Uso comercial (anúncios,
  assinatura, venda) exige licença paga; consulte os termos antes de mudar o modelo.

É necessário acesso à internet. A modalidade pública pode impor espera entre
consultas. O serviço respeita `retryAfter`, informa o intervalo e reutiliza URLs
válidas por dez minutos. A disponibilidade da API não é controlada pelo Maru.

Opcionalmente, defina `TTS_QUEST_API_KEY` no ambiente antes de iniciar o servidor.
A chave permanece no backend. Só trechos do conteúdo de estudo são aceitos;
frases livres digitadas pelo aluno não são enviadas ao provedor de voz.

Os efeitos de acerto e conclusão do Arcade usam osciladores Web Audio no navegador.
São opcionais, independentes da pronúncia e não criam arquivos.

## Leituras de kanji: KanjiAPI

`core/kanji.js` consulta `https://kanjiapi.dev/v1/kanji/{caractere}` ao abrir
um cartão. São apresentados número de traços e leituras kun/on, com explicação
em português. A API fornece dados textuais; não possui endpoint de áudio.

O navegador guarda a consulta por 24 horas. `frontend/assets/data/kanji-api.json`
é uma cópia das respostas dos 20 kanji introdutórios, consultados em 6/9/2026,
usada apenas quando a API estiver indisponível. O arquivo registra a fonte e a data.

- [Documentação e origem dos dados](https://github.com/onlyskin/kanjiapi.dev).
- [KANJIDIC2 / EDRDG](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project).
- [Licença dos dados EDRDG](https://www.edrdg.org/edrdg/licence.html).

As explicações, traduções em português e exercícios do Maru são autorais.
Os traços de escrita continuam vindo de KanjiVG; os créditos estão na interface,
nas folhas de impressão e em `frontend/assets/data/LICENSE.md`.

## Tutor e correção com IA

Os controles aparecem quando `/api/ai/status` indica disponibilidade. A correção
com IA é opcional no exercício de frases; sem IA, permanece a comparação local
com o modelo. O tutor aparece na leitura e conclusão das lições, fora do quiz.
Ambos exigem login e informam que o texto será enviado à OpenAI. As respostas
são exibidas como texto escapado, sem interpretar HTML do modelo.
A configuração da chave e da quota está em `maru-backend/docs/INTEGRATIONS.md`.
