import { LEVELS, createDictionary, createShiritori, chainKana, startKana } from '/shared/shiritori.js';
import { personalBest } from '/shared/arcade.js';
import { recordReview, recordActivity } from '/shared/progress.js';
import { getPronunciation } from '/shared/pronunciation.js';
import { esc, icon, routeLink, audioButton } from '../core/ui.js';
import { kanaModeButton } from '../core/kanaInput.js';

// A lista (~18 mil palavras) só é baixada quando alguém abre o jogo, e uma única vez.
let dictionaryRequest;
export const loadDictionary = () => dictionaryRequest ||= fetch('/assets/data/shiritori-words.json')
  .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
  .then(data => createDictionary(data.words))
  .catch(error => { dictionaryRequest = null; throw error; });

const TURN_SECONDS = 20;
const MAX_HINTS = 3;
export const shiritoriBestKey = (level, duration) => `shiritori:${level}:${duration}`;
const options = (items, current) => items.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');

// Mostra a palavra com o kana de encadeamento destacado.
function chainWord(word, last = false) {
  const reading = [...word.reading];
  let index = reading.length - 1;
  while (index > 0 && reading[index] === 'ー') index--;
  const tail = reading.slice(index).join('');
  const speak = word.vocabId && getPronunciation(word.written) ? audioButton(word.written, `Ouvir ${word.written}`) : '';
  return `<li class="chain-word ${word.by === 'bot' ? 'by-maru' : 'by-you'} ${last ? 'is-last' : ''}"><small>${word.by === 'bot' ? 'Maru' : 'Você'}</small><span class="chain-reading" lang="ja">${esc(reading.slice(0, index).join(''))}<mark>${esc(tail)}</mark></span>${word.written !== word.reading ? `<span class="chain-written" lang="ja">${esc(word.written)}</span>` : ''}${word.pt ? `<span class="chain-meaning">${esc(word.pt)}</span>` : ''}${speak}</li>`;
}

export function renderShiritori(ctx, game) {
  const controller = new AbortController();
  const config = { level: 'calm', duration: 0 };
  let dictionary, match, phase = 'setup', message = '', hint = null, hintsUsed = 0, deadline = 0, timer, maruWords = new Set();
  const stopTimer = () => { clearInterval(timer); timer = null; };
  const bestKey = () => shiritoriBestKey(config.level, config.duration);
  const best = () => ctx.progress.arcade?.[bestKey()]?.score || 0;
  const header = () => `<div class="play-session-heading">${routeLink('practice', '← Todos os jogos', 'text-link')}<span class="play-tag">${game.subtitle}</span></div>`;

  function setup() {
    stopTimer(); phase = 'setup';
    ctx.main.innerHTML = `<div class="play-page">${header()}<section class="play-setup"><div class="play-setup-intro ${game.color}"><img src="/assets/img/irasutoya-${game.image}.webp" width="230" height="230" alt=""><p class="eyebrow">UM CLÁSSICO DAS CRIANÇAS NO JAPÃO</p><h1 tabindex="-1">${game.title}</h1><p>${game.description}</p></div><form id="shiritori-setup" class="play-setup-form"><h2>Como se joga</h2><ol class="shiritori-rules"><li>O Maru diz uma palavra. A sua começa com o <b>último som</b> dela: <span class="shiritori-example" lang="ja">りん<mark>ご</mark> → <mark>ご</mark>りら → <mark>ら</mark>っぱ</span>.</li><li>Vale substantivo em kana, kanji ou romaji. Palavra repetida não vale.</li><li>Terminou em <b lang="ja">ん</b>? Perdeu: ninguém começa uma palavra com ん.</li></ol>
      <label for="shiritori-level">Adversário</label><select class="text-input" name="level" id="shiritori-level">${options(LEVELS, config.level)}</select>
      <label for="shiritori-duration">Ritmo</label><select class="text-input" name="duration" id="shiritori-duration">${options([['0', '∞ Sem relógio · pense com calma'], [String(TURN_SECONDS), `${TURN_SECONDS} segundos por palavra`]], String(config.duration))}</select>
      <button class="btn btn-primary play-start" type="submit">Vamos jogar ${icon('arrow')}</button><p class="field-hint">Palavras sem ser do vocabulário do Maru aparecem sem tradução. Lista de palavras: JMdict (EDRDG), CC BY-SA 4.0.</p><p id="setup-feedback" role="status"></p></form></section></div>`;
  }

  async function start() {
    const feedback = ctx.main.querySelector('#setup-feedback');
    const button = ctx.main.querySelector('.play-start');
    if (!dictionary) {
      if (button) button.disabled = true;
      if (feedback) feedback.textContent = 'Preparando o dicionário…';
      try { dictionary = await loadDictionary(); }
      catch { if (feedback) feedback.textContent = 'Não foi possível carregar as palavras. Verifique a conexão e tente de novo.'; if (button) button.disabled = false; return; }
      if (controller.signal.aborted) return;
    }
    match = createShiritori({ dictionary, level: config.level });
    match.start();
    phase = 'playing'; message = ''; hint = null; hintsUsed = 0; maruWords = new Set();
    resetClock(); draw();
  }
  function resetClock() {
    stopTimer(); deadline = config.duration ? Date.now() + config.duration * 1000 : 0;
    if (deadline) timer = setInterval(tick, 200);
  }
  function tick() {
    if (phase !== 'playing' || !deadline) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const clock = ctx.main.querySelector('#shiritori-clock');
    if (clock) { clock.textContent = `${remaining}s`; clock.classList.toggle('is-urgent', remaining <= 5); }
    if (!remaining) { match.timeout(); finish(); }
  }

  function draw() {
    const history = match.history;
    const required = match.required;
    ctx.main.innerHTML = `<div class="play-page play-session shiritori">${header()}<div class="play-scoreboard"><span><small>SUAS PALAVRAS</small><strong>${match.chain}</strong></span><span><small>RECORDE</small><strong>${best()}</strong></span><span><small>${deadline ? 'TEMPO' : 'RITMO'}</small><strong id="shiritori-clock" role="timer">${deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) + 's' : '∞'}</strong></span><button class="text-link" id="shiritori-giveup">Desistir</button></div>
      <section class="play-question"><h1 class="sr-only" tabindex="-1">${game.title}</h1><ol class="shiritori-chain" aria-label="Palavras da partida">${history.map((word, i) => chainWord(word, i === history.length - 1)).join('')}</ol>
      <p class="shiritori-turn">Sua vez. Comece com <span class="shiritori-kana" lang="ja">${esc(required)}</span></p>
      <form id="shiritori-form" autocomplete="off"><label class="sr-only" for="shiritori-answer">Sua palavra começando com ${esc(required)}</label><input class="text-input play-answer" id="shiritori-answer" name="answer" placeholder="${esc(required)}…" lang="ja" data-kana autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40">${kanaModeButton()}<button class="btn btn-primary" id="shiritori-send">Jogar ${icon('arrow')}</button></form>
      <div id="shiritori-feedback" role="status" aria-live="polite">${message ? `<p class="shiritori-message">${message}</p>` : ''}${hint ? `<p class="shiritori-hint">Que tal <b lang="ja">${esc(hint.reading)}</b>${hint.written !== hint.reading ? ` <span lang="ja">(${esc(hint.written)})</span>` : ''}${hint.pt ? ` · ${esc(hint.pt)}` : ''}?</p>` : ''}</div>
      <button class="text-link play-skip" id="shiritori-hint" ${hintsUsed >= MAX_HINTS ? 'disabled' : ''}>Me dá uma dica · ${MAX_HINTS - hintsUsed} restantes</button></section>
      <p class="play-session-note">${config.level === 'calm' ? 'Maru tranquilo' : 'Maru esperto'} · ${dictionary.size.toLocaleString('pt-BR')} palavras na lista · respostas que não valem não contam como erro</p></div>`;
    ctx.main.querySelector('#shiritori-answer')?.focus({ preventScroll: true });
    ctx.main.querySelector('.shiritori-chain .is-last')?.scrollIntoView?.({ block: 'nearest', inline: 'end' });
  }

  function play(text) {
    if (phase !== 'playing') return;
    if (deadline && Date.now() >= deadline) { match.timeout(); return finish(); }
    const move = match.play(text);
    if (!move.ok) {
      const typed = esc(String(text).trim());
      message = {
        empty: 'Escreva uma palavra para continuar.',
        unknown: `Não encontrei <b lang="ja">${typed}</b> na lista. Confira a grafia ou tente outro substantivo.`,
        start: move.word ? `<b lang="ja">${esc(move.word.reading)}</b> começa com <b lang="ja">${esc(startKana(move.word.key))}</b>. Procure uma palavra com <b lang="ja">${esc(match.required)}</b>.` : '',
        repeat: move.word ? `<b lang="ja">${esc(move.word.reading)}</b> já apareceu nesta partida.` : ''
      }[move.reason] || '';
      ctx.audio.feedback('incorrect');
      draw(); ctx.main.querySelector('#shiritori-answer').value = String(text);
      return;
    }
    message = ''; hint = null;
    // Usar uma palavra do Maru é recordar vocabulário: entra na revisão espaçada.
    if (move.word.vocabId) { recordReview(ctx.progress, `arcade:${game.id}:kana:play:${move.word.vocabId}`, true); maruWords.add(move.word.vocabId); }
    else recordActivity(ctx.progress, 4);
    ctx.save();
    if (move.result) return finish();
    ctx.audio.feedback('correct');
    resetClock(); draw();
  }

  function finish() {
    if (phase !== 'playing') return;
    phase = 'results'; stopTimer();
    const { winner, reason, chain } = match.result;
    const newBest = chain > 0 && personalBest(ctx.progress, bestKey(), chain);
    ctx.save();
    ctx.audio.feedback(winner === 'player' ? 'complete' : 'incorrect');
    const last = match.history.at(-1);
    const title = { 'bot-stuck': 'O Maru ficou sem palavras!', n: `Terminou em ん. O Maru venceu desta vez.`, time: 'O tempo acabou.', 'gave-up': 'Partida encerrada.' }[reason];
    const detail = { 'bot-stuck': `Ninguém lembrou uma palavra com <b lang="ja">${esc(chainKana(last.key))}</b>. Vitória sua.`, n: `<b lang="ja">${esc(last.reading)}</b> termina em ん, e nenhuma palavra japonesa começa com esse som.`, time: `Faltou uma palavra com <b lang="ja">${esc(match.required)}</b>.`, 'gave-up': 'Tudo bem. Cada partida deixa palavras novas no caminho.' }[reason];
    ctx.main.innerHTML = `<div class="play-page play-results shiritori">${header()}<div class="play-result-hero"><img src="/assets/img/irasutoya-${game.image}.webp" width="150" height="150" alt=""><p class="eyebrow">${newBest ? 'SEU NOVO RECORDE!' : winner === 'player' ? 'VOCÊ VENCEU' : 'CADA PALAVRA CONTA'}</p><h1 tabindex="-1">${title}</h1><p>${detail}</p></div><div class="play-results-stats"><div><strong>${chain}</strong><span>palavras suas</span></div><div><strong>${match.history.length}</strong><span>palavras na cadeia</span></div><div><strong>${maruWords.size}</strong><span>do vocabulário do Maru</span></div><div><strong>${best()}</strong><span>recorde neste modo</span></div></div><section class="panel shiritori-recap"><h2>A cadeia completa</h2><ol class="shiritori-chain is-recap">${match.history.map(word => chainWord(word)).join('')}</ol></section><div class="play-actions"><button class="btn btn-primary" id="shiritori-restart">Jogar de novo</button><button class="btn btn-ghost" id="shiritori-configure">Mudar treino</button>${routeLink('progress', 'Ver meu desempenho', 'text-link')}</div></div>`;
    ctx.main.querySelector('h1')?.focus();
  }

  ctx.main.addEventListener('submit', event => {
    if (!['shiritori-setup', 'shiritori-form'].includes(event.target.id)) return;
    event.preventDefault();
    if (event.target.id === 'shiritori-setup') { const data = new FormData(event.target); config.level = data.get('level') === 'sharp' ? 'sharp' : 'calm'; config.duration = Number(data.get('duration')) ? TURN_SECONDS : 0; start(); }
    else play(event.target.elements.answer.value);
  }, { signal: controller.signal });
  ctx.main.addEventListener('keydown', event => { if (event.isComposing && event.key === 'Enter') event.preventDefault(); }, { signal: controller.signal });
  ctx.main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.id === 'shiritori-giveup' && phase === 'playing') { match.giveUp(); finish(); }
    if (button.id === 'shiritori-hint' && phase === 'playing' && hintsUsed < MAX_HINTS) { hint = match.hint(); hintsUsed++; message = ''; const typed = ctx.main.querySelector('#shiritori-answer')?.value || ''; draw(); ctx.main.querySelector('#shiritori-answer').value = typed; }
    if (button.id === 'shiritori-restart') start();
    if (button.id === 'shiritori-configure') setup();
  }, { signal: controller.signal });
  document.addEventListener('visibilitychange', tick, { signal: controller.signal });
  setup();
  return () => { stopTimer(); controller.abort(); };
}
