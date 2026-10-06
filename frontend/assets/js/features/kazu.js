import { makeDeck, personalBest } from '/shared/arcade.js';
import { KAZU_CATEGORIES, KAZU_MODES, kazuPool, kazuQuestion, kazuReviewKey, kazuBestKey, kazuPoints } from '/shared/kazu.js';
import { recordReview } from '/shared/progress.js';
import { esc, icon, routeLink, audioButton } from '../core/ui.js';

const options = (items, current) => items.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
const DURATIONS = [['0', '∞ Infinito · sem pressa'], ['60', '60 segundos · sprint'], ['120', '120 segundos · desafio']];
const categoryLabel = id => KAZU_CATEGORIES.find(([value]) => value === id)?.[1] || '';
const answerText = item => item.jp === item.reading ? `${item.jp} · ${item.pt}` : `${item.jp} · ${item.reading} (${item.romaji})`;

// "Quanto, quando, qual": números, horas, datas, contadores e これ/それ/あれ com quatro botões
// grandes, como o "Só mais um". Acertou, passa sozinho; errou, mostra a resposta e a dica.
export function renderKazu(ctx, game, params = {}) {
  const config = { category: KAZU_CATEGORIES.some(([id]) => id === params.category) ? params.category : 'numbers', mode: 'read', duration: 0 };
  const fromLesson = Boolean(params.category);
  const controller = new AbortController();
  let phase = 'setup', pool, nextItem, question, feedback = null, timer = null, advance = null, deadline = 0;
  let attempts = 0, correct = 0, score = 0, streak = 0, bestStreak = 0, missed = new Map();
  const header = () => `<div class="play-session-heading">${routeLink('practice', '← Todos os jogos', 'text-link')}<span class="play-tag">${game.subtitle}</span></div>`;
  const stopTimers = () => { clearInterval(timer); clearTimeout(advance); timer = advance = null; };

  function setup() {
    stopTimers(); phase = 'setup';
    ctx.main.innerHTML = `<div class="play-page kazu-page">${header()}<section class="play-setup"><div class="play-setup-intro ${game.color}"><img src="/assets/img/irasutoya-${game.image}.webp" width="230" height="230" alt=""><p class="eyebrow">QUANTO? QUANDO? QUAL?</p><h1 tabindex="-1">${game.title}</h1><p>${game.description}</p><ol class="renda-how only-wide"><li>Veja o número, a hora ou a palavra.</li><li>Toque na leitura certa.</li><li>Errou? A dica mostra o porquê, e o item volta mais vezes.</li></ol></div>
      <form id="kazu-setup" class="play-setup-form"><h2>Monte seu treino.</h2>${fromLesson ? `<p class="renda-from">${icon('path')}<span>Vindo da trilha: o treino começa por <strong>${esc(categoryLabel(config.category))}</strong>.</span></p>` : '<p class="only-wide">Só toque, sem teclado. As leituras especiais (よじ, ついたち, さんぼん) aparecem bastante.</p>'}
      <label for="kazu-category">O que treinar</label><select class="text-input" name="category" id="kazu-category">${options(KAZU_CATEGORIES, config.category)}</select>
      <label for="kazu-mode">Como jogar</label><select class="text-input" name="mode" id="kazu-mode">${options(KAZU_MODES, config.mode)}</select>
      <label for="kazu-duration">Ritmo</label><select class="text-input" name="duration" id="kazu-duration">${options(DURATIONS, String(config.duration))}</select>
      <button class="btn btn-primary play-start" type="submit">Vamos jogar ${icon('arrow')}</button><p class="field-hint only-wide">No computador, use as teclas 1 a 4 para responder e Enter para seguir.</p><p id="setup-feedback" role="status"></p></form></section></div>`;
  }

  function start() {
    pool = kazuPool(config.category);
    // O sorteio dá mais vezes o que você costuma errar, no sentido escolhido.
    const direction = config.mode === 'meaning' ? 'meaning' : 'read';
    const reviews = Object.fromEntries(pool.map(item => [item.id, ctx.progress.reviews[kazuReviewKey(item, direction)]]).filter(([, value]) => value));
    nextItem = makeDeck(pool, reviews, '');
    phase = 'playing'; attempts = correct = score = streak = bestStreak = 0; missed = new Map();
    deadline = config.duration ? Date.now() + config.duration * 1000 : 0;
    stopTimers(); if (deadline) timer = setInterval(tick, 200);
    next();
  }
  function next() {
    clearTimeout(advance); advance = null;
    if (phase !== 'playing') return;
    if (deadline && Date.now() >= deadline) return finish(true);
    // No "Tudo misturado", as alternativas vêm da mesma categoria do item sorteado.
    const item = nextItem();
    question = kazuQuestion(item, config.category === 'all' ? kazuPool(item.category) : pool, config.mode); feedback = null;
    draw();
  }
  function tick() {
    if (phase !== 'playing' || !deadline) return;
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const clock = ctx.main.querySelector('#kazu-clock');
    if (clock) { clock.textContent = `${left}s`; clock.classList.toggle('is-urgent', left <= 10); }
    const track = ctx.main.querySelector('.play-time-track');
    if (track) track.style.setProperty('--remaining', String(Math.max(0, (deadline - Date.now()) / (config.duration * 1000))));
    if (!left) finish(true);
  }

  function draw() {
    const { item, direction, prompt, choices } = question;
    const label = direction === 'meaning' ? 'COMO SE DIZ EM JAPONÊS?' : item.category === 'pointing' ? 'O QUE ISTO QUER DIZER?' : 'COMO SE LÊ?';
    const state = choice => !feedback ? '' : choice.key === question.answer ? 'is-right' : choice.key === feedback.chosen ? 'is-wrong' : 'is-out';
    const left = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
    ctx.main.innerHTML = `<div class="play-page play-session renda-session kazu-session">${header()}<div class="play-scoreboard"><span><small>PONTOS</small><strong>${score}</strong></span><span><small>SEQUÊNCIA</small><strong>${streak} ${icon('fire')}</strong></span><span><small>${deadline ? 'TEMPO' : 'RITMO'}</small><strong id="kazu-clock" role="timer">${deadline ? left + 's' : '∞'}</strong></span><button class="text-link" id="kazu-finish" type="button">Encerrar</button></div>${deadline ? `<div class="play-time-track" aria-hidden="true" style="--remaining:${Math.max(0, (deadline - Date.now()) / (config.duration * 1000))}"><span></span></div>` : ''}
      <section class="renda-stage"><h1 class="sr-only" tabindex="-1">${game.title}</h1><p class="eyebrow">${label}</p><div class="renda-prompt ${prompt.lang === 'ja' ? 'is-glyph' : 'is-text'}" lang="${prompt.lang}"><span>${esc(prompt.main)}</span>${prompt.sub ? `<small>${esc(prompt.sub)}</small>` : ''}</div>
      <div class="renda-choices" role="group" aria-label="Escolha a resposta">${choices.map((choice, index) => `<button type="button" class="renda-choice ${state(choice)}" data-choice="${esc(choice.key)}" ${feedback ? 'disabled' : ''}><kbd aria-hidden="true">${index + 1}</kbd><span class="renda-choice-main" lang="${choice.lang}">${esc(choice.main)}</span>${choice.sub ? `<small lang="ja">${esc(choice.sub)}</small>` : ''}</button>`).join('')}</div>
      <div class="renda-feedback" aria-live="polite">${!feedback ? '' : feedback.correct ? `<p class="renda-hit">${icon('check')} Isso! +${feedback.points}</p>` : `<div class="play-feedback incorrect"><div class="renda-answer"><strong>Quase! A resposta é <span lang="ja">${esc(answerText(item))}</span></strong>${audioButton(item.speak, 'Ouvir ' + item.jp)}</div><p class="renda-hint"><span>Quer dizer</span>${esc(item.pt)}${item.hint ? `. ${esc(item.hint)}` : ''}</p><button class="btn btn-primary" id="kazu-next" type="button">Próximo ${icon('arrow')}</button></div>`}</div></section>
      <p class="play-session-note">${attempts} ${attempts === 1 ? 'resposta' : 'respostas'} · ${categoryLabel(config.category)} · ${deadline ? 'Recorde pessoal: ' + (ctx.progress.arcade?.[kazuBestKey(config)]?.score || 0) : 'Sem limite de rodadas'}</p></div>`;
    if (feedback && !feedback.correct) ctx.main.querySelector('#kazu-next')?.focus({ preventScroll: true });
  }

  function answer(key) {
    if (phase !== 'playing' || feedback) return;
    if (deadline && Date.now() >= deadline) return finish(true);
    const right = key === question.answer;
    attempts++; correct += Number(right); streak = right ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak);
    const points = right ? kazuPoints(streak) : 0;
    score += points;
    if (!right) missed.set(question.item.id, question.item);
    recordReview(ctx.progress, kazuReviewKey(question.item, question.direction), right);
    ctx.save(); ctx.audio.feedback(right ? 'correct' : 'incorrect');
    if (!right && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(40);
    feedback = { correct: right, chosen: key, points };
    draw();
    if (right) advance = setTimeout(next, 450);
  }

  function finish() {
    if (phase !== 'playing') return;
    phase = 'results'; stopTimers();
    const newBest = config.duration > 0 && personalBest(ctx.progress, kazuBestKey(config), score);
    ctx.save();
    const review = [...missed.values()].slice(0, 8);
    ctx.main.innerHTML = `<div class="play-page play-results">${header()}<div class="play-result-hero"><img src="/assets/img/irasutoya-${game.image}.webp" width="150" height="150" alt=""><p class="eyebrow">${newBest ? 'SEU NOVO RECORDE!' : 'CADA TOQUE CONTA'}</p><h1 tabindex="-1">${!attempts ? 'Tudo bem começar de novo.' : missed.size ? 'Os números já estão ficando seus.' : 'Mesa limpa: nenhum erro!'}</h1><p>${attempts ? `${correct} de ${attempts} certas · ${score} pontos · melhor sequência: ${bestStreak}` : 'Nenhuma resposta nesta rodada.'}</p></div>
      ${review.length ? `<section class="panel renda-review"><h2>Vale mais uma olhada</h2><ul>${review.map(item => `<li><span class="renda-review-char jp" lang="ja">${esc(item.jp)}</span><span><strong lang="ja">${esc(item.reading)}</strong><small>${esc(item.pt)}${item.hint ? ` · ${esc(item.hint)}` : ''}</small></span>${audioButton(item.speak, 'Ouvir ' + item.jp)}</li>`).join('')}</ul></section>` : ''}
      <p class="field-hint">Os erros voltam com mais frequência nas próximas rodadas e entram na sua revisão espaçada.</p><div class="play-actions"><button class="btn btn-primary" id="kazu-restart">Mais uma rodada ${icon('repeat')}</button><button class="btn btn-ghost" id="kazu-configure">Mudar treino</button>${routeLink('progress', 'Ver meu desempenho', 'text-link')}</div></div>`;
    ctx.main.querySelector('h1')?.focus();
  }

  ctx.main.addEventListener('submit', event => {
    if (event.target.id !== 'kazu-setup') return;
    event.preventDefault();
    const data = new FormData(event.target);
    Object.assign(config, { category: data.get('category'), mode: data.get('mode'), duration: Number(data.get('duration')) });
    start();
  }, { signal: controller.signal });
  ctx.main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.choice) answer(button.dataset.choice);
    if (button.id === 'kazu-next') next();
    if (button.id === 'kazu-finish') finish();
    if (button.id === 'kazu-restart') start();
    if (button.id === 'kazu-configure') setup();
  }, { signal: controller.signal });
  document.addEventListener('keydown', event => {
    if (phase !== 'playing' || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, select, textarea')) return;
    const index = Number(event.key) - 1;
    if (!feedback && index >= 0 && index < question.choices.length) { event.preventDefault(); answer(question.choices[index].key); }
    else if (feedback && !feedback.correct && (event.key === 'Enter' || event.key === ' ') && document.activeElement?.id !== 'kazu-next') { event.preventDefault(); next(); }
  }, { signal: controller.signal });
  document.addEventListener('visibilitychange', tick, { signal: controller.signal });
  setup();
  return () => { stopTimers(); controller.abort(); };
}
