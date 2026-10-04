import { makeDeck, personalBest } from '/shared/arcade.js';
import { RENDA_SCRIPTS, RENDA_RANGES, RENDA_MODES, MEMORY_HINTS, rendaPool, rendaQuestion, rendaReviewKey, rendaBestKey, rendaPoints } from '/shared/renda.js';
import { recordReview } from '/shared/progress.js';
import { esc, icon, routeLink, audioButton } from '../core/ui.js';

const options = (items, current) => items.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
const DURATIONS = [['0', '∞ Infinito · sem pressa'], ['60', '60 segundos · sprint'], ['120', '120 segundos · desafio']];
const kanaRows = rows => rows.map(row => ({ a: 'あ', ka: 'か', sa: 'さ', ta: 'た', na: 'な', ha: 'は', ma: 'ま', ya: 'や', ra: 'ら', wa: 'わ', n: 'ん' }[row])).filter(Boolean).join(' ');

// "Só mais um": um caractere por vez, quatro botões grandes, sem teclado. Acertou, passa
// sozinho; errou, mostra a resposta e a dica de memória da lição antes de seguir.
export function renderRenda(ctx, game, params = {}) {
  const trail = Array.isArray(params.rows) && params.rows.length ? { rows: params.rows, groups: params.groups || [] } : null;
  const config = { script: RENDA_SCRIPTS.some(([id]) => id === params.script) ? params.script : 'hiragana', range: trail ? 'trail' : 'basic', mode: 'read', duration: 60 };
  const controller = new AbortController();
  let phase = 'setup', pool, nextItem, question, feedback = null, timer = null, advance = null, deadline = 0;
  let attempts = 0, correct = 0, score = 0, streak = 0, bestStreak = 0, missed = new Map();
  const header = () => `<div class="play-session-heading">${routeLink('practice', '← Todos os jogos', 'text-link')}<span class="play-tag">${game.subtitle}</span></div>`;
  const stopTimers = () => { clearInterval(timer); clearTimeout(advance); timer = advance = null; };
  const ranges = () => trail ? [['trail', `Só o que já vi na trilha (${kanaRows(trail.rows)}${trail.groups.length ? ' e mais' : ''})`], ...RENDA_RANGES] : RENDA_RANGES;
  const scope = () => config.range === 'trail' && trail && config.script !== 'kanji' ? { script: config.script, ...trail } : { script: config.script, range: config.range === 'trail' ? 'all' : config.range };

  function setup() {
    stopTimers(); phase = 'setup';
    ctx.main.innerHTML = `<div class="play-page">${header()}<section class="play-setup"><div class="play-setup-intro ${game.color}"><img src="/assets/img/irasutoya-${game.image}.png" width="230" height="230" alt=""><p class="eyebrow">VIU. TOCOU. MAIS UM.</p><h1 tabindex="-1">${game.title}</h1><p>${game.description}</p><ol class="renda-how only-wide"><li>Aparece uma letra ou um kanji.</li><li>Toque na resposta certa entre quatro.</li><li>Acertou, já vem o próximo. Errou, você vê a dica.</li></ol></div>
      <form id="renda-setup" class="play-setup-form"><h2>Monte seu treino.</h2>${params.from ? `<p class="renda-from">${icon('path')}<span>Vindo da lição <strong>${esc(params.from)}</strong>: o treino começa pelo que você já viu.</span></p>` : '<p class="only-wide">Só toque, sem teclado. Dá para jogar com uma mão no ônibus.</p>'}
      <label for="renda-script">O que treinar</label><select class="text-input" name="script" id="renda-script">${options(RENDA_SCRIPTS, config.script)}</select>
      <div id="renda-range-field"${config.script === 'kanji' ? ' hidden' : ''}><label for="renda-range">Quais letras</label><select class="text-input" name="range" id="renda-range">${options(ranges(), config.range)}</select></div>
      <label for="renda-mode">Como jogar</label><select class="text-input" name="mode" id="renda-mode">${options(RENDA_MODES, config.mode)}</select>
      <label for="renda-duration">Ritmo</label><select class="text-input" name="duration" id="renda-duration">${options(DURATIONS, String(config.duration))}</select><p class="field-hint only-wide">No desafio, o relógio continua entre as respostas e ao trocar de aba.</p>
      <button class="btn btn-primary play-start" type="submit">Vamos jogar ${icon('arrow')}</button><p class="field-hint only-wide">No computador, use as teclas 1 a 4 para responder e Enter para seguir.</p><p id="setup-feedback" role="status"></p></form></section></div>`;
  }

  function start() {
    pool = rendaPool(scope());
    if (pool.length < 4) { ctx.main.querySelector('#setup-feedback').textContent = 'Ainda há poucas letras nesta seleção. Escolha mais letras para jogar.'; return; }
    // O sorteio dá mais vezes os caracteres em que você costuma errar no sentido "ler".
    const reviews = Object.fromEntries(pool.map(item => [item.id, ctx.progress.reviews[rendaReviewKey(item, 'read')]]).filter(([, value]) => value));
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
    question = rendaQuestion(nextItem(), pool, config.mode); feedback = null;
    draw();
  }
  function tick() {
    if (phase !== 'playing' || !deadline) return;
    const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const clock = ctx.main.querySelector('#renda-clock');
    if (clock) { clock.textContent = `${left}s`; clock.classList.toggle('is-urgent', left <= 10); }
    const track = ctx.main.querySelector('.play-time-track');
    if (track) track.style.setProperty('--remaining', String(Math.max(0, (deadline - Date.now()) / (config.duration * 1000))));
    if (!left) finish(true);
  }

  function draw() {
    const { item, direction, prompt, choices } = question;
    const kanji = item.kind === 'kanji';
    const label = direction === 'read' ? (kanji ? 'O QUE ESTE KANJI QUER DIZER?' : 'QUAL É O SOM?') : (kanji ? 'QUAL É O KANJI?' : 'QUAL É A LETRA?');
    const state = choice => !feedback ? '' : choice.key === question.answer ? 'is-right' : choice.key === feedback.chosen ? 'is-wrong' : 'is-out';
    const hint = MEMORY_HINTS.get(item.char);
    const answerText = kanji ? `${item.char} · ${item.meaning} (${item.reading})` : item.label;
    const left = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
    ctx.main.innerHTML = `<div class="play-page play-session renda-session">${header()}<div class="play-scoreboard"><span><small>PONTOS</small><strong>${score}</strong></span><span><small>SEQUÊNCIA</small><strong>${streak} ${icon('fire')}</strong></span><span><small>${deadline ? 'TEMPO' : 'RITMO'}</small><strong id="renda-clock" role="timer">${deadline ? left + 's' : '∞'}</strong></span><button class="text-link" id="renda-finish">Encerrar</button></div>${deadline ? `<div class="play-time-track" aria-hidden="true" style="--remaining:${Math.max(0, (deadline - Date.now()) / (config.duration * 1000))}"><span></span></div>` : ''}
      <section class="renda-stage"><h1 class="sr-only" tabindex="-1">${game.title}</h1><p class="eyebrow">${label}</p><div class="renda-prompt ${prompt.lang === 'ja' ? 'is-glyph' : 'is-text'}" lang="${prompt.lang}"><span>${esc(prompt.main)}</span>${prompt.sub ? `<small lang="ja">${esc(prompt.sub)}</small>` : ''}</div>
      <div class="renda-choices" role="group" aria-label="Escolha a resposta">${choices.map((choice, index) => `<button type="button" class="renda-choice ${state(choice)}" data-choice="${choice.key}" ${feedback ? 'disabled' : ''}><kbd aria-hidden="true">${index + 1}</kbd><span class="renda-choice-main" lang="${choice.lang}">${esc(choice.main)}</span>${choice.sub ? `<small lang="ja">${esc(choice.sub)}</small>` : ''}</button>`).join('')}</div>
      <div class="renda-feedback" aria-live="polite">${!feedback ? '' : feedback.correct ? `<p class="renda-hit">${icon('check')} Isso! +${feedback.points}</p>` : `<div class="play-feedback incorrect"><div class="renda-answer"><strong>Quase! A resposta é <span lang="ja">${esc(answerText)}</span></strong>${audioButton(item.char, 'Ouvir ' + item.char)}</div>${hint ? `<p class="renda-hint"><span>Dica de memória</span>${esc(hint)}</p>` : ''}<button class="btn btn-primary" id="renda-next">Próxima ${icon('arrow')}</button></div>`}</div></section>
      <p class="play-session-note">${attempts} ${attempts === 1 ? 'resposta' : 'respostas'} · ${pool.length} caracteres neste treino · ${deadline ? 'Recorde pessoal: ' + (ctx.progress.arcade?.[rendaBestKey(config)]?.score || 0) : 'Sem limite de rodadas'}</p></div>`;
    if (feedback && !feedback.correct) ctx.main.querySelector('#renda-next')?.focus({ preventScroll: true });
  }

  function answer(key) {
    if (phase !== 'playing' || feedback) return;
    if (deadline && Date.now() >= deadline) return finish(true);
    const right = key === question.answer;
    attempts++; correct += Number(right); streak = right ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak);
    const points = right ? rendaPoints(streak) : 0;
    score += points;
    if (!right) missed.set(question.item.id, question.item);
    recordReview(ctx.progress, rendaReviewKey(question.item, question.direction), right);
    ctx.save(); ctx.audio.feedback(right ? 'correct' : 'incorrect');
    if (!right && !matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(40);
    feedback = { correct: right, chosen: key, points };
    draw();
    if (right) advance = setTimeout(next, 450);
  }

  function finish(expired = false) {
    if (phase !== 'playing') return;
    phase = 'results'; stopTimers();
    const newBest = config.duration > 0 && personalBest(ctx.progress, rendaBestKey(config), score);
    ctx.save();
    const review = [...missed.values()].slice(0, 8);
    ctx.main.innerHTML = `<div class="play-page play-results">${header()}<div class="play-result-hero"><img src="/assets/img/irasutoya-${game.image}.png" width="150" height="150" alt=""><p class="eyebrow">${newBest ? 'SEU NOVO RECORDE!' : 'CADA TOQUE CONTA'}</p><h1 tabindex="-1">${!attempts ? 'Tudo bem começar de novo.' : missed.size ? 'Só mais um? Você já está pegando o jeito.' : 'Mesa limpa: nenhum erro!'}</h1><p>${config.duration ? (expired ? 'Tempo encerrado. Pronto para tentar superar sua marca?' : 'Desafio encerrado. Seu resultado ficou salvo.') : 'Seu treino fica salvo. Volte quando quiser.'}</p></div><div class="play-results-stats"><div><strong>${score}</strong><span>pontos</span></div><div><strong>${attempts ? Math.round(correct / attempts * 100) : 0}%</strong><span>de acertos</span></div><div><strong>${correct}/${attempts}</strong><span>respostas certas</span></div><div><strong>${bestStreak}</strong><span>melhor sequência</span></div></div>
      ${review.length ? `<section class="panel renda-review"><h2>Vale mais uma olhada</h2><ul>${review.map(item => `<li><span class="renda-review-char jp" lang="ja">${esc(item.char)}</span><span><strong>${esc(item.kind === 'kanji' ? `${item.meaning} · ${item.reading}` : item.label.split(' · ')[1])}</strong>${MEMORY_HINTS.get(item.char) ? `<small>${esc(MEMORY_HINTS.get(item.char))}</small>` : ''}</span>${audioButton(item.char, 'Ouvir ' + item.char)}</li>`).join('')}</ul></section>` : ''}
      <p class="field-hint">Os erros voltam com mais frequência nas próximas rodadas e entram na sua revisão espaçada.</p><div class="play-actions"><button class="btn btn-primary" id="renda-restart">Só mais um ${icon('repeat')}</button><button class="btn btn-ghost" id="renda-configure">Mudar treino</button>${routeLink('progress', 'Ver meu desempenho', 'text-link')}</div></div>`;
    ctx.main.querySelector('h1')?.focus();
  }

  ctx.main.addEventListener('submit', event => {
    if (event.target.id !== 'renda-setup') return;
    event.preventDefault();
    const data = new FormData(event.target);
    Object.assign(config, { script: data.get('script'), range: data.get('range') || config.range, mode: data.get('mode'), duration: Number(data.get('duration')) });
    start();
  }, { signal: controller.signal });
  ctx.main.addEventListener('change', event => {
    if (event.target.id === 'renda-script') ctx.main.querySelector('#renda-range-field').hidden = event.target.value === 'kanji';
  }, { signal: controller.signal });
  ctx.main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.choice) answer(button.dataset.choice);
    if (button.id === 'renda-next') next();
    if (button.id === 'renda-finish') finish();
    if (button.id === 'renda-restart') start();
    if (button.id === 'renda-configure') setup();
  }, { signal: controller.signal });
  document.addEventListener('keydown', event => {
    if (phase !== 'playing' || event.altKey || event.ctrlKey || event.metaKey || event.target.closest?.('input, select, textarea')) return;
    const index = Number(event.key) - 1;
    if (!feedback && index >= 0 && index < question.choices.length) { event.preventDefault(); answer(question.choices[index].key); }
    else if (feedback && !feedback.correct && (event.key === 'Enter' || event.key === ' ') && document.activeElement?.id !== 'renda-next') { event.preventDefault(); next(); }
  }, { signal: controller.signal });
  document.addEventListener('visibilitychange', tick, { signal: controller.signal });
  setup();
  return () => { stopTimers(); controller.abort(); };
}
