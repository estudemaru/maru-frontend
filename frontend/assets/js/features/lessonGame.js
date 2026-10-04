import { lessonGame, LESSON_GAME_KINDS } from '/shared/lessonGame.js';
import { esc, icon } from '../core/ui.js';
import { createVoiceGate } from './voice.js';
import { lessonArt } from './lessonScenes.js';

// O jogo que fecha cada lição. Vive dentro da lição e avisa o fim por onFinish({ correct, total }).
// Se a voz falhar, a pessoa pode continuar lendo: nenhuma rodada depende só do áudio.
export function mountLessonGame(ctx, container, lesson, onFinish) {
  const controller = new AbortController();
  const game = lessonGame(lesson);
  let kind = game.kind, index = -1, correct = 0, feedback = null, audio = 'idle';
  const round = () => game.rounds[index];
  const face = card => kind === 'read' ? card.romaji : card.card;
  const voice = createVoiceGate(ctx, state => {
    const same = audio === state; audio = state;
    const count = container.querySelector('#lesson-game-wait');
    if (same && state === 'waiting' && count) { count.textContent = String(voice.secondsLeft()); return; }
    draw();
    if (state === 'ready') ctx.audio.speak(round().target.speak, container.querySelector('#lesson-game-replay'));
  });
  const locked = () => kind === 'listen' && audio !== 'ready';

  function status() {
    if (kind !== 'listen' || feedback) return '';
    const read = '<button class="text-link" type="button" data-game="read">Jogar lendo em vez de ouvir</button>';
    return {
      loading: 'Preparando a voz do Maru…',
      ready: 'Qual carta você ouviu?',
      waiting: `A API de voz pediu uma pausa. Tentamos de novo em <b id="lesson-game-wait">${voice.secondsLeft()}</b> s. ${read}`,
      failed: `Não foi possível preparar a voz. <button class="text-link" type="button" data-game="retry">Tentar de novo</button> ${read}`
    }[audio] || '';
  }

  function draw() {
    if (index < 0) {
      container.innerHTML = `<div class="lesson-game-intro"><div class="lesson-scene"><div class="lesson-scene-copy"><span class="step-label">HORA DO JOGO</span><h2 data-focus tabindex="-1">${LESSON_GAME_KINDS[kind]}</h2></div>${lessonArt()}</div><p>${kind === 'listen' ? 'O Maru lê um exemplo desta lição. Pegue a carta certa na mesa.' : 'Veja um exemplo desta lição e escolha como ele se lê.'} São ${game.rounds.length} rodadas, sem relógio.</p>${kind === 'listen' ? '<p class="muted small">Ligue o som. Se a voz não estiver disponível, dá para continuar lendo.</p>' : ''}<div class="lesson-controls"><button class="btn btn-ghost" type="button" data-game="skip">Pular o jogo</button><button class="btn btn-primary" type="button" data-game="start">Começar o jogo ${icon('arrow')}</button></div></div>`;
      return;
    }
    const { target, cards } = round();
    const last = index + 1 === game.rounds.length;
    const state = card => !feedback ? '' : card.id === target.id ? 'is-right' : card.id === feedback.chosen ? 'is-wrong' : 'is-out';
    container.innerHTML = `<span class="step-label">${LESSON_GAME_KINDS[kind].toUpperCase()} · ${index + 1} DE ${game.rounds.length}</span>
      ${kind === 'listen' ? `<div class="karuta-listen"><button class="btn btn-ghost" id="lesson-game-replay" type="button" ${locked() ? 'disabled' : ''}>${icon('volume')} Ouvir de novo</button></div>` : `<p class="lesson-game-prompt" lang="ja" data-focus tabindex="-1">${esc(target.jp)}</p>`}
      <p class="karuta-status" role="status" aria-live="polite">${status()}</p>
      <div class="karuta-table lesson-game-table" role="group" aria-label="Cartas na mesa">${cards.map((card, i) => `<button class="karuta-card ${state(card)}" type="button" data-game-card="${esc(card.id)}" ${kind === 'listen' ? 'lang="ja"' : ''} ${feedback || locked() ? 'disabled' : ''}><small aria-hidden="true">${i + 1}</small><span>${esc(face(card))}</span></button>`).join('')}</div>
      ${feedback ? `<div class="feedback ${feedback.correct ? 'success' : 'retry'}" role="status"><strong>${feedback.correct ? 'Pegou!' : 'Quase. Compare com calma.'}</strong><p><b lang="ja">${esc(target.jp)}</b>${target.reading !== target.jp ? ` <span lang="ja">(${esc(target.reading)})</span>` : ''} · ${esc(target.romaji)} · ${esc(target.pt)}</p></div><div class="lesson-controls align-end"><button class="btn btn-primary" type="button" data-game="next" data-focus>${last ? 'Ver resultado' : 'Próxima'} ${icon('arrow')}</button></div>` : ''}`;
    const focus = container.querySelector('[data-focus]') || (locked() ? null : container.querySelector('.karuta-card'));
    focus?.focus({ preventScroll: true });
  }

  function next() {
    index++; feedback = null;
    if (index >= game.rounds.length) { finish(); return; }
    if (kind === 'listen') { audio = 'loading'; draw(); voice.load(round().target.speak, game.rounds[index + 1]?.target.speak); }
    else draw();
  }
  function answer(id) {
    if (feedback || locked() || index < 0) return;
    const right = id === round().target.id;
    correct += Number(right);
    feedback = { chosen: id, correct: right };
    ctx.audio.feedback(right ? 'correct' : 'incorrect');
    draw();
  }
  function finish() { voice.cancel(); ctx.audio.stop(); controller.abort(); onFinish({ correct, total: game.rounds.length, kind }); }

  container.addEventListener('click', event => {
    const card = event.target.closest('[data-game-card]');
    if (card) return answer(card.dataset.gameCard);
    const action = event.target.closest('[data-game]')?.dataset.game;
    if (action === 'start' || action === 'next') next();
    if (action === 'skip') { voice.cancel(); controller.abort(); onFinish(null); }
    if (action === 'retry') voice.retry();
    // Trocar para leitura não conta erro: a rodada atual recomeça sem áudio.
    if (action === 'read') { voice.cancel(); ctx.audio.stop(); kind = 'read'; audio = 'idle'; draw(); }
    if (event.target.closest('#lesson-game-replay') && audio === 'ready') ctx.audio.speak(round().target.speak, event.target.closest('#lesson-game-replay'));
  }, { signal: controller.signal });
  container.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || index < 0) return;
    const pick = round()?.cards[Number(event.key) - 1];
    if (pick) { event.preventDefault(); answer(pick.id); }
  }, { signal: controller.signal });
  draw();
  return () => { voice.cancel(); controller.abort(); };
}
