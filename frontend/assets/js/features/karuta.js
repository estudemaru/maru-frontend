import { buildPool, makeDeck, reviewPrefix, personalBest, insights } from '/shared/arcade.js';
import { KARUTA_SCRIPTS, createRounds, roundScore } from '/shared/karuta.js';
import { recordReview } from '/shared/progress.js';
import { esc, icon, routeLink } from '../core/ui.js';
import { createVoiceGate } from './voice.js';

const options = (items, current) => items.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
const detailList = items => items.length ? `<ul>${items.map(item => `<li><span lang="ja">${esc(item.label)}</span><strong>${item.accuracy}% <small>· ${item.attempts} tentativas</small></strong></li>`).join('')}</ul>` : '<p class="muted">Ainda estamos conhecendo seu ritmo. Responda cada item pelo menos 3 vezes.</p>';

// Estados do áudio da rodada: loading (preparando), ready, waiting (429 da API de voz) e failed.
// Sem áudio pronto não há como responder: as cartas ficam bloqueadas e o relógio pausado.
export function renderKaruta(ctx, game) {
  const config = { game: game.id, script: 'kana', duration: 0 };
  const controller = new AbortController();
  let phase = 'setup', rounds, round, pool, prefix, feedback = null;
  let attempts = 0, correct = 0, score = 0, streak = 0, bestStreak = 0;
  let audio = 'idle', timer = null, deadline = 0, pausedAt = 0;
  const voice = createVoiceGate(ctx, state => {
    if (phase !== 'playing') return;
    if (state === 'ready') resumeClock();
    setAudio(state);
    if (state === 'ready') ctx.audio.speak(round.target.speak, ctx.main.querySelector('#karuta-replay'));
  });
  const bestKey = () => `${prefix}${config.duration}`;
  const header = () => `<div class="play-session-heading">${routeLink('practice', '← Todos os jogos', 'text-link')}<span class="play-tag">${game.subtitle}</span></div>`;
  const stopTimers = () => { clearInterval(timer); timer = null; voice.cancel(); };
  const remaining = () => Math.max(0, Math.ceil((deadline - (pausedAt || Date.now())) / 1000));

  function setup() {
    stopTimers(); ctx.audio.stop(); phase = 'setup';
    ctx.main.innerHTML = `<div class="play-page">${header()}<section class="play-setup"><div class="play-setup-intro ${game.color}"><img src="/assets/img/irasutoya-${game.image}.webp" width="230" height="230" alt=""><p class="eyebrow">OUÇA. PROCURE. PEGUE.</p><h1 tabindex="-1">${game.title}</h1><p>${game.description}</p></div><form id="karuta-setup" class="play-setup-form"><h2>Como se joga</h2><ol class="shiritori-rules"><li>O Maru lê uma palavra em voz alta.</li><li>Seis cartas estão na mesa. Toque na que corresponde ao que você ouviu, ou use as teclas <b>1</b> a <b>6</b>.</li><li>Pode ouvir de novo quantas vezes quiser, e a pontuação continua a mesma.</li></ol>
      <label for="karuta-script">Cartas</label><select class="text-input" name="script" id="karuta-script">${options(KARUTA_SCRIPTS, config.script)}</select>
      <label for="karuta-duration">Ritmo</label><select class="text-input" name="duration" id="karuta-duration">${options([['0', '∞ Infinito · sem pressa'], ['60', '60 segundos · sprint'], ['120', '120 segundos · desafio']], String(config.duration))}</select><p class="field-hint only-wide">No desafio, o relógio só para enquanto a voz do Maru está sendo preparada.</p>
      <button class="btn btn-primary play-start" type="submit">Vamos jogar ${icon('arrow')}</button><p class="field-hint">Ligue o som. Usamos a voz japonesa do aparelho ou, quando necessário, VOICEVOX:No.7 pela internet.</p><p id="setup-feedback" role="status"></p></form></section></div>`;
  }

  function start() {
    pool = buildPool(config); prefix = reviewPrefix(config);
    rounds = createRounds(makeDeck(pool, ctx.progress.reviews, prefix), pool);
    phase = 'playing'; attempts = correct = score = streak = bestStreak = 0;
    deadline = config.duration ? Date.now() + config.duration * 1000 : 0; pausedAt = 0;
    stopTimers(); if (deadline) timer = setInterval(tick, 200);
    next();
  }
  function next() {
    if (deadline && !pausedAt && Date.now() >= deadline) return finish(true);
    round = rounds.next(); feedback = null;
    draw(); listen();
  }

  // O relógio do desafio pausa enquanto a voz não está pronta, para uma falha da API não custar tempo.
  function pauseClock() { if (deadline && !pausedAt) pausedAt = Date.now(); }
  function resumeClock() { if (deadline && pausedAt) { deadline += Date.now() - pausedAt; pausedAt = 0; } }
  function tick() {
    if (phase !== 'playing' || !deadline) return;
    const clock = ctx.main.querySelector('#karuta-clock');
    const left = remaining();
    if (clock) { clock.textContent = `${left}s`; clock.classList.toggle('is-urgent', left <= 10); }
    if (!pausedAt && !left) finish(true);
  }

  // Sem voz pronta, as cartas ficam bloqueadas; a próxima rodada já é pedida quando esta fica pronta.
  function listen() { pauseClock(); voice.load(round.target.speak, rounds.upcoming.target.speak); }

  const statusText = () => ({
    loading: 'Preparando a voz do Maru…',
    ready: feedback ? '' : 'Qual carta você ouviu?',
    waiting: `A API de voz pediu uma pausa. Tentamos de novo em <b id="karuta-wait">${voice.secondsLeft()}</b> s. ${deadline ? 'O relógio está parado.' : ''}`,
    failed: 'Não foi possível preparar a voz desta rodada. Nenhuma resposta foi registrada.'
  })[audio] || '';
  function setAudio(state) {
    const same = audio === state;
    audio = state;
    const count = ctx.main.querySelector('#karuta-wait');
    if (same && state === 'waiting' && count) { count.textContent = String(voice.secondsLeft()); return; }
    const status = ctx.main.querySelector('#karuta-status');
    if (status) status.innerHTML = statusText();
    ctx.main.querySelectorAll('.karuta-card').forEach(card => { card.disabled = Boolean(feedback) || audio !== 'ready'; });
    const replay = ctx.main.querySelector('#karuta-replay');
    if (replay) replay.disabled = audio !== 'ready';
    const retry = ctx.main.querySelector('#karuta-retry');
    if (retry) retry.hidden = audio !== 'failed';
    if (state === 'ready' && !feedback && !ctx.main.querySelector('.karuta-table').contains(document.activeElement)) ctx.main.querySelector('.karuta-card')?.focus({ preventScroll: true });
  }

  function draw() {
    const target = round.target;
    const cardState = card => !feedback ? '' : card.id === target.id ? 'is-right' : card.id === feedback.chosen ? 'is-wrong' : 'is-out';
    ctx.main.innerHTML = `<div class="play-page play-session karuta">${header()}<div class="play-scoreboard"><span><small>PONTOS</small><strong>${score}</strong></span><span><small>SEQUÊNCIA</small><strong>${streak} ${icon('fire')}</strong></span><span><small>${deadline ? 'TEMPO' : 'RITMO'}</small><strong id="karuta-clock" role="timer">${deadline ? remaining() + 's' : '∞'}</strong></span><button class="text-link" id="karuta-finish">Encerrar</button></div>
      <section class="play-question"><p class="eyebrow">OUÇA E PEGUE A CARTA</p><h1 class="sr-only" tabindex="-1">${game.title}</h1>
      <div class="karuta-listen"><button class="btn btn-ghost" id="karuta-replay" type="button" ${audio !== 'ready' ? 'disabled' : ''}>${icon('volume')} Ouvir de novo</button><button class="btn btn-ghost" id="karuta-retry" type="button" ${audio !== 'failed' ? 'hidden' : ''}>Tentar de novo</button></div>
      <p class="karuta-status" id="karuta-status" role="status" aria-live="polite">${statusText()}</p>
      <div class="karuta-table" role="group" aria-label="Cartas na mesa">${round.cards.map((card, i) => `<button class="karuta-card ${cardState(card)}" type="button" data-card="${esc(card.id)}" lang="ja" ${feedback || audio !== 'ready' ? 'disabled' : ''}><small aria-hidden="true">${i + 1}</small><span>${esc(card.card)}</span></button>`).join('')}</div>
      <div id="karuta-feedback" aria-live="polite">${feedback ? `<div class="play-feedback ${feedback.correct ? 'correct' : 'incorrect'}"><strong>${feedback.correct ? 'Pegou! Continue assim.' : 'Quase. Ouça mais uma vez e compare.'}</strong><p>O Maru disse <b lang="ja">${esc(target.card)}</b>${target.card !== target.reading ? ` <span lang="ja">(${esc(target.reading)})</span>` : ''} · ${esc(target.romaji)} · ${esc(target.pt)}</p><button class="btn btn-primary" id="karuta-next">Próxima ${icon('arrow')}</button></div>` : ''}</div></section>
      <p class="play-session-note">${attempts} respostas · ${pool.length} palavras no baralho · ${deadline ? 'Recorde pessoal: ' + (ctx.progress.arcade?.[bestKey()]?.score || 0) : 'Sem limite de rodadas'}</p></div>`;
    if (feedback) ctx.main.querySelector('#karuta-next')?.focus({ preventScroll: true });
  }

  function answer(id) {
    if (phase !== 'playing' || feedback || audio !== 'ready') return;
    if (deadline && Date.now() >= deadline) return finish(true);
    const right = id === round.target.id;
    attempts++; correct += Number(right); streak = right ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak); score += roundScore(right, streak);
    recordReview(ctx.progress, prefix + round.target.id, right);
    ctx.save(); ctx.audio.feedback(right ? 'correct' : 'incorrect');
    feedback = { correct: right, chosen: id }; draw();
  }

  function finish(expired = false) {
    if (phase !== 'playing') return;
    phase = 'results'; stopTimers(); ctx.audio.stop();
    const newBest = config.duration > 0 && personalBest(ctx.progress, bestKey(), score);
    ctx.save();
    const analysis = insights(pool, ctx.progress.reviews, prefix);
    ctx.main.innerHTML = `<div class="play-page play-results">${header()}<div class="play-result-hero"><img src="/assets/img/irasutoya-${game.image}.webp" width="150" height="150" alt=""><p class="eyebrow">${newBest ? 'SEU NOVO RECORDE!' : 'CADA CARTA CONTA'}</p><h1 tabindex="-1">${attempts ? 'Seus ouvidos agradecem.' : 'Tudo bem começar de novo.'}</h1><p>${config.duration ? (expired ? 'Tempo encerrado. Pronto para tentar superar sua marca?' : 'Desafio encerrado. Seu resultado ficou salvo.') : 'Seu treino fica salvo. Volte quando quiser.'}</p></div><div class="play-results-stats"><div><strong>${score}</strong><span>pontos</span></div><div><strong>${attempts ? Math.round(correct / attempts * 100) : 0}%</strong><span>de acertos</span></div><div><strong>${correct}/${attempts}</strong><span>cartas certas</span></div><div><strong>${bestStreak}</strong><span>melhor sequência</span></div></div><div class="play-insights"><section class="panel"><h2>Você já reconhece de ouvido</h2>${detailList(analysis.strong)}</section><section class="panel"><h2>Vale ouvir de novo</h2>${detailList(analysis.weak)}</section></div><div class="play-actions"><button class="btn btn-primary" id="karuta-restart">Jogar de novo</button><button class="btn btn-ghost" id="karuta-configure">Mudar treino</button>${routeLink('progress', 'Ver meu desempenho', 'text-link')}</div></div>`;
    ctx.main.querySelector('h1')?.focus();
  }

  ctx.main.addEventListener('submit', event => {
    if (event.target.id !== 'karuta-setup') return;
    event.preventDefault();
    const data = new FormData(event.target);
    config.script = KARUTA_SCRIPTS.some(([value]) => value === data.get('script')) ? data.get('script') : 'kana';
    config.duration = [60, 120].includes(Number(data.get('duration'))) ? Number(data.get('duration')) : 0;
    start();
  }, { signal: controller.signal });
  ctx.main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.card) answer(button.dataset.card);
    if (button.id === 'karuta-replay' && audio === 'ready') ctx.audio.speak(round.target.speak, button);
    if (button.id === 'karuta-retry' && phase === 'playing') voice.retry();
    if (button.id === 'karuta-next') next();
    if (button.id === 'karuta-finish') finish();
    if (button.id === 'karuta-restart') start();
    if (button.id === 'karuta-configure') setup();
  }, { signal: controller.signal });
  ctx.main.addEventListener('keydown', event => {
    if (phase !== 'playing' || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, select, textarea')) return;
    const index = Number(event.key) - 1;
    if (Number.isInteger(index) && round.cards[index]) { event.preventDefault(); answer(round.cards[index].id); }
  }, { signal: controller.signal });
  document.addEventListener('visibilitychange', tick, { signal: controller.signal });
  setup();
  return () => { stopTimers(); controller.abort(); };
}
