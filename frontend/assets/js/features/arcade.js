import { GAMES, SCRIPTS, buildPool, acceptsAnswer, makeDeck, reviewPrefix, insights, personalBest, activeReviews } from '/shared/arcade.js';
import { recordReview } from '/shared/progress.js';
import { esc, icon, routeLink } from '../core/ui.js';
import { renderShiritori, shiritoriBestKey } from './shiritori.js';
import { renderKaruta } from './karuta.js';
import { renderRenda } from './renda.js';
import { renderKazu } from './kazu.js';
import { KAZU_CATEGORIES, kazuItem } from '/shared/kazu.js';
import { dailyBanner } from './dailyBanner.js';
import { kanaModeButton } from '../core/kanaInput.js';
import { LEVELS } from '/shared/shiritori.js';

const cardMeta = game => game.kind === 'tap' ? `<b class="play-new">NOVO</b> Só tocar <span>·</span> ${icon('clock')} Com tempo` : game.kind === 'chain' ? `<b class="play-new">NOVO</b> Contra o Maru <span>·</span> ${icon('clock')} 20s por vez` : game.kind === 'listen' ? `<b class="play-new">NOVO</b> ${icon('volume')} Com som <span>·</span> ${icon('clock')} Com tempo` : `∞ Livre <span>·</span> ${icon('clock')} Com tempo`;
export function gameCards() {
  // Jogos por turnos ocupam a linha inteira; um cartão comum sozinho na última linha também.
  const regular = GAMES.filter(game => game.kind !== 'chain' && !game.featured);
  const span = game => regular.length % 2 === 1 && game === regular.at(-1);
  return GAMES.map((game, i) => `<a class="play-card ${game.color} ${game.featured ? 'is-featured' : game.kind === 'chain' ? 'is-wide' : span(game) ? 'is-span' : ''}" href="#/arcade/${game.id}"><div class="play-card-art"><span class="play-number">0${i + 1}</span><img src="/assets/img/irasutoya-${game.image}.webp" width="150" height="150" alt="" loading="lazy"><span class="play-arrow" aria-hidden="true">↗</span></div><div class="play-card-copy"><span class="play-subtitle">${game.subtitle}</span><h3>${game.title}</h3><p>${game.description}</p><span class="play-card-meta">${cardMeta(game)}</span></div></a>`).join('');
}
export function renderArcadeHub(ctx) {
  ctx.main.innerHTML = `<div class="play-page"><header class="play-heading"><p class="eyebrow">UM POUQUINHO, TODO DIA</p><h1 tabindex="-1">Seu próximo acerto começa aqui.</h1><p>Escolha um jogo. Encontre seu ritmo. Tente mais uma vez.</p></header>${dailyBanner(ctx.progress)}<p>${routeLink("sentence-coach", "Montar e corrigir frases " + icon("chat"), "btn btn-ghost")}</p><div class="play-grid">${gameCards()}</div><div class="play-note only-wide">${icon('spark')} Todos os jogos têm prática infinita e desafio com tempo. Seu progresso é salvo a cada resposta.</div></div>`;
}
const options = (items, current) => items.map(([value, label]) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`).join('');
const detailList = items => items.length ? `<ul>${items.map(item => `<li><span>${esc(item.label)}</span><strong>${item.accuracy}% <small>· ${item.attempts} tentativas</small></strong></li>`).join('')}</ul>` : '<p class="muted">Ainda estamos conhecendo seu ritmo. Responda cada item pelo menos 3 vezes.</p>';
export function renderArcade(ctx, id = 'sentences', params = {}) {
  const game = GAMES.find(game => game.id === id) || GAMES.find(game => game.id === 'sentences');
  if (game.id === 'kazu') return renderKazu(ctx, game, params);
  if (game.kind === 'tap') return renderRenda(ctx, game, params);
  if (game.kind === 'chain') return renderShiritori(ctx, game);
  if (game.kind === 'listen') return renderKaruta(ctx, game);
  const config = { game: game.id, script: ['sentences', 'translate'].includes(game.id) ? 'all' : game.id === 'difference' ? 'kana' : 'hiragana', duration: 0 };
  const controller = new AbortController();
  let timer, deadline = 0, phase = 'setup', nextItem, item, prefix, pool, attempts = 0, correct = 0, score = 0, streak = 0, bestStreak = 0, feedback = null, imageReady = true;
  const stopTimer = () => { clearInterval(timer); timer = null; };
  const bestKey = () => `${prefix}${config.duration}`;
  const header = () => `<div class="play-session-heading">${routeLink('practice', '← Todos os jogos', 'text-link')}<span class="play-tag">${game.subtitle}</span></div>`;
  function setup() {
    stopTimer(); phase = 'setup';
    const scripts = game.id === 'difference' ? SCRIPTS.filter(([value]) => ['hiragana', 'katakana', 'kana'].includes(value)) : ['sentences', 'translate'].includes(game.id) ? SCRIPTS.filter(([value]) => ['kana', 'all'].includes(value)) : SCRIPTS;
    ctx.main.innerHTML = `<div class="play-page">${header()}<section class="play-setup"><div class="play-setup-intro ${game.color}"><img src="/assets/img/irasutoya-${game.image}.webp" width="230" height="230" alt=""><p class="eyebrow">PRATIQUE. DESCUBRA. REPITA.</p><h1 tabindex="-1">${game.title}</h1><p>${game.description}</p></div><form id="arcade-setup" class="play-setup-form"><h2>Do seu jeito.</h2><p class="only-wide">Um treino tranquilo ou uma corrida contra o relógio?</p><label for="arcade-script">${['sentences', 'translate'].includes(game.id) ? 'Escrita das frases' : 'O que você quer praticar?'}</label><select class="text-input" name="script" id="arcade-script">${options(scripts, config.script)}</select>${game.id === 'pictures' ? '<p class="field-hint">Kana combina hiragana e katakana. Kanji usa palavras escritas só com kanji; Tudo aceita também a leitura em kana.</p>' : ''}
      <label for="arcade-duration">Ritmo</label><select class="text-input" name="duration" id="arcade-duration">${options([['0', '∞ Infinito · sem pressa'], ['60', '60 segundos · sprint'], ['120', '120 segundos · desafio']], String(config.duration))}</select><p class="field-hint only-wide">No desafio, o relógio continua entre as respostas e ao trocar de aba.</p><button class="btn btn-primary play-start" type="submit">Vamos jogar ${icon('arrow')}</button><p class="field-hint">${game.id === 'translate' ? 'Escreva em português. A correção aceita modelos e algumas variantes; traduções livres podem não ser reconhecidas.' : 'Digite em romaji e veja virar kana na hora (MAIÚSCULAS ou o botão ア viram katakana), ou use o teclado japonês. Espaços e pontuação não alteram o resultado.'}</p><p id="setup-feedback" role="status"></p></form></section></div>`;
  }
  function finish(expired = false) {
    if (phase !== 'playing') return;
    phase = 'results'; stopTimer();
    const newBest = config.duration > 0 && personalBest(ctx.progress, bestKey(), score);
    ctx.save();
    const analysis = insights(pool, ctx.progress.reviews, prefix);
    ctx.main.innerHTML = `<div class="play-page play-results">${header()}<div class="play-result-hero"><img src="/assets/img/irasutoya-study-nihongo.webp" width="150" height="150" alt=""><p class="eyebrow">${newBest ? 'SEU NOVO RECORDE!' : 'CADA TENTATIVA CONTA'}</p><h1 tabindex="-1">${attempts ? 'Um pouco melhor que antes.' : 'Tudo bem começar de novo.'}</h1><p>${config.duration ? (expired ? 'Tempo encerrado. Pronto para tentar superar sua marca?' : 'Desafio encerrado. Seu resultado ficou salvo.') : 'Seu treino fica salvo. Volte quando quiser.'}</p></div><div class="play-results-stats"><div><strong>${score}</strong><span>pontos</span></div><div><strong>${attempts ? Math.round(correct / attempts * 100) : 0}%</strong><span>de acertos</span></div><div><strong>${correct}/${attempts}</strong><span>respostas certas</span></div><div><strong>${bestStreak}</strong><span>melhor sequência</span></div></div><div class="play-insights"><section class="panel"><h2>Já está ficando natural</h2>${detailList(analysis.strong)}</section><section class="panel"><h2>Vale mais uma tentativa</h2>${detailList(analysis.weak)}</section></div><p class="field-hint only-wide">Retrato do seu histórico neste jogo e escrita. 80% de acertos ou mais indica um ponto forte, a partir de 3 tentativas por item.</p><div class="play-actions"><button class="btn btn-primary" id="arcade-restart">Jogar de novo</button><button class="btn btn-ghost" id="arcade-configure">Mudar treino</button>${routeLink('progress', 'Ver meu desempenho', 'text-link')}</div></div>`;
    ctx.main.querySelector('h1')?.focus();
  }
  function tick() {
    if (phase !== 'playing' || !deadline) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const clock = ctx.main.querySelector('#arcade-clock');
    if (clock) { clock.textContent = `${remaining}s`; clock.classList.toggle('is-urgent', remaining <= 10); }
    const track = ctx.main.querySelector('.play-time-track');
    if (track) track.style.setProperty('--remaining', String(Math.max(0, (deadline - Date.now()) / (config.duration * 1000))));
    if (!remaining) finish(true);
  }
  function start() {
    pool = buildPool(config); prefix = reviewPrefix(config);
    if (!pool.length) { ctx.main.querySelector('#setup-feedback').textContent = 'Ainda não há itens para esta combinação. Escolha outra escrita.'; return; }
    nextItem = makeDeck(pool, ctx.progress.reviews, prefix);
    phase = 'playing'; attempts = correct = score = streak = bestStreak = 0;
    deadline = config.duration ? Date.now() + config.duration * 1000 : 0;
    next(); if (deadline) timer = setInterval(tick, 200);
  }
  function next() { if (deadline && Date.now() >= deadline) return finish(true); item = nextItem(); feedback = null; imageReady = !item.image; draw(); }
  function draw() {
    ctx.main.innerHTML = `<div class="play-page play-session">${header()}<div class="play-scoreboard"><span><small>PONTOS</small><strong>${score}</strong></span><span><small>SEQUÊNCIA</small><strong>${streak} ${icon('fire')}</strong></span><span><small>${deadline ? 'TEMPO' : 'RITMO'}</small><strong id="arcade-clock" role="timer">${deadline ? Math.max(0, Math.ceil((deadline-Date.now())/1000)) + 's' : '∞'}</strong></span><button class="text-link" id="arcade-finish">Encerrar</button></div>${deadline ? `<div class="play-time-track" aria-hidden="true" style="--remaining:${Math.max(0,(deadline-Date.now())/(config.duration*1000))}"><span></span></div>` : ""}<section class="play-question"><p class="eyebrow">${game.id === 'pictures' ? 'QUAL É A PALAVRA?' : game.id === 'difference' ? 'ENCONTRE O CARACTERE' : game.id === 'translate' ? 'DO JAPONÊS PARA O PORTUGUÊS' : 'TRANSCREVA A FRASE'}</p><h1 class="sr-only" tabindex="-1">${game.title}</h1>${item.instruction ? `<p class="play-instruction">${esc(item.instruction)}</p>` : ""}${item.image ? `<div class="play-picture"><img id="question-image" src="/assets/img/irasutoya-${item.image}.webp" alt="Imagem para identificar em japonês" width="220" height="220"><span id="image-status" role="status">Carregando imagem…</span></div>` : `<p class="play-prompt ${game.id === 'difference' ? 'play-prompt-short' : ''}" ${['sentences','translate'].includes(game.id) ? 'lang="ja"' : ''}>${esc(item.prompt)}</p>`}<span class="play-tag">${SCRIPTS.find(([key]) => key === config.script)?.[1]}</span>
      <form id="arcade-answer-form" autocomplete="off">${item.choices ? `<div class="play-choices">${item.choices.map(choice => `<button class="play-choice" type="button" data-choice="${choice}" lang="ja" ${feedback ? 'disabled' : ''}>${choice}</button>`).join('')}</div>` : `<label class="sr-only" for="arcade-answer">Sua resposta</label><input class="text-input play-answer" id="arcade-answer" name="answer" placeholder="${item.language === 'pt' ? 'Escreva em português…' : 'Escreva em japonês…'}" lang="${item.language}" ${item.language === 'ja' ? 'data-kana' : ''} autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="240" ${feedback ? 'disabled' : ''}>${item.language === 'ja' && !feedback ? kanaModeButton() : ''}<button class="btn btn-primary" id="arcade-check" ${feedback || !imageReady ? 'disabled' : ''}>Conferir ${icon('arrow')}</button>`}</form><div id="arcade-feedback" aria-live="polite">${feedback ? `<div class="play-feedback ${feedback.correct ? 'correct' : 'incorrect'}"><strong>${feedback.correct ? 'Isso! Continue assim.' : 'Compare com o modelo.'}</strong>${feedback.answer ? `<p>Sua resposta: <span>${esc(feedback.answer)}</span></p>` : ''}<p>Modelo: <b lang="${item.language}">${esc(item.answers[0])}</b></p><p>${esc(item.hint || '')}</p><button class="btn btn-primary" id="arcade-next">Próxima ${icon('arrow')}</button></div>` : ''}</div>${!feedback ? '<button class="text-link play-skip" id="arcade-skip">Ainda não sei · mostrar resposta</button>' : ''}</section><p class="play-session-note">${attempts} respostas · ${pool.length} itens neste treino · ${deadline ? 'Recorde pessoal: ' + (ctx.progress.arcade?.[bestKey()]?.score || 0) : 'Sem limite de rodadas'}</p></div>`;
    const input = ctx.main.querySelector('#arcade-answer');
    if (!feedback) input?.focus({ preventScroll: true }); else ctx.main.querySelector('#arcade-next')?.focus({ preventScroll: true });
    const img = ctx.main.querySelector('#question-image');
    if (img) {
      const ready = () => { imageReady = true; const status = ctx.main.querySelector('#image-status'); if (status) status.hidden = true; const check = ctx.main.querySelector('#arcade-check'); if (check && !feedback) check.disabled = false; };
      img.addEventListener('load', ready, { once: true, signal: controller.signal });
      img.addEventListener('error', () => { imageReady = false; ctx.main.querySelector('#image-status').textContent = 'Não foi possível carregar a imagem. Encerre e tente novamente; nenhuma resposta será registrada.'; }, { once: true, signal: controller.signal });
      if (img.complete && img.naturalWidth) ready();
    }
  }
  function answer(text, skipped = false) {
    if (phase !== 'playing' || feedback || (!imageReady && item.image)) return;
    if (deadline && Date.now() >= deadline) return finish(true);
    if (!skipped && !text.trim()) return;
    const right = !skipped && acceptsAnswer(item, text);
    attempts++; correct += Number(right); streak = right ? streak + 1 : 0; bestStreak = Math.max(bestStreak, streak); score += right ? 100 + Math.min(5, streak - 1) * 10 : 0;
    recordReview(ctx.progress, prefix + item.id, right);
    if (right && game.id === 'sentences') ctx.progress.stats.sentencesWritten++;
    ctx.save(); ctx.audio.feedback(right ? "correct" : "incorrect"); feedback = { correct: right, answer: text }; draw();
  }
  ctx.main.addEventListener('submit', event => {
    if (!['arcade-setup', 'arcade-answer-form'].includes(event.target.id)) return;
    event.preventDefault();
    if (event.target.id === 'arcade-setup') { const data = new FormData(event.target); config.script = data.get('script'); config.duration = Number(data.get('duration')); start(); }
    else answer(event.target.elements.answer?.value || '');
  }, { signal: controller.signal });
  ctx.main.addEventListener('keydown', event => { if (event.isComposing && event.key === 'Enter') event.preventDefault(); }, { signal: controller.signal });
  ctx.main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.choice) answer(button.dataset.choice);
    if (button.id === 'arcade-next') next();
    if (button.id === 'arcade-skip') answer('', true);
    if (button.id === 'arcade-finish') finish();
    if (button.id === 'arcade-restart') start();
    if (button.id === 'arcade-configure') setup();
  }, { signal: controller.signal });
  document.addEventListener('visibilitychange', tick, { signal: controller.signal });
  setup();
  return () => { stopTimer(); controller.abort(); };
}

export function renderArcadeProgress(ctx) {
  // O shiritori só registra palavras usadas (sempre acertos); fica fora da taxa geral.
  const records = activeReviews(ctx.progress.reviews).filter(([key]) => !GAMES.some(game => game.kind === 'chain' && key.startsWith(`arcade:${game.id}:`)));
  const total = records.reduce((sum, [, item]) => sum + item.attempts, 0);
  const correct = records.reduce((sum, [, item]) => sum + item.correct, 0);
  const sections = GAMES.map(game => {
    if (game.kind === 'chain') {
      const words = activeReviews(ctx.progress.reviews).filter(([key]) => key.startsWith(`arcade:${game.id}:`));
      const labels = new Map(buildPool({ game: game.id }).map(item => [item.id, item.label]));
      const bests = LEVELS.map(([level, label]) => [label.split(' · ')[0], Math.max(...[0, 20].map(duration => ctx.progress.arcade?.[shiritoriBestKey(level, duration)]?.score || 0))]);
      const used = words.sort(([, a], [, b]) => b.attempts - a.attempts).slice(0, 6).map(([key, item]) => `<li><span lang="ja">${esc(labels.get(key.split(':').slice(4).join(':')) || 'Palavra do Maru')}</span><strong>${item.attempts}× <small>usada em partidas</small></strong></li>`).join('');
      return `<section class="panel play-progress-card"><div><img src="/assets/img/irasutoya-${game.image}.webp" width="64" height="64" alt=""><h2>${game.title}</h2><span>${bests.some(([, score]) => score) ? bests.map(([label, score]) => `${label}: ${score} palavras`).join(' · ') : 'Sua primeira partida está esperando'}</span></div>${used ? `<details><summary>Vocabulário do Maru que você já usou</summary><ul>${used}</ul></details>` : ''}${routeLink('arcade/' + game.id, 'Jogar →', 'text-link')}</section>`;
    }
    const rows = records.filter(([key]) => key.startsWith(`arcade:${game.id}:`));
    const attempts = rows.reduce((sum, [, item]) => sum + item.attempts, 0);
    const correct = rows.reduce((sum, [, item]) => sum + item.correct, 0);
    const labels = new Map();
    for (const [key] of rows) {
      const [, , script, , ...id] = key.split(':');
      if (game.id === 'kazu') { const item = kazuItem(id.join(':')); if (item) labels.set(key, `${item.jp} · ${item.reading}`); continue; }
      const pool = buildPool({ game: game.id, script });
      const item = pool.find(item => item.id === id.join(':'));
      if (item) labels.set(key, item.label);
    }
    const qualified = rows.filter(([, item]) => item.attempts >= 3).map(([key, item]) => ({ label: `${labels.get(key) || 'Item praticado'} · ${(game.id === 'kazu' ? KAZU_CATEGORIES : SCRIPTS).find(([script]) => script === key.split(':')[2])?.[1] || ''}`, attempts: item.attempts, accuracy: Math.round(100 * item.correct / item.attempts) }));
    return `<section class="panel play-progress-card"><div><img src="/assets/img/irasutoya-${game.image}.webp" width="64" height="64" alt=""><h2>${game.title}</h2><span>${attempts ? Math.round(correct / attempts * 100) + '% de acertos · ' + attempts + ' respostas' : 'Seu primeiro treino está esperando'}</span></div>${attempts ? `<details><summary>Pontos fortes e o que revisar</summary><h3>Pontos fortes</h3>${detailList(qualified.filter(item => item.accuracy >= 80).sort((a,b) => b.accuracy-a.accuracy).slice(0,4))}<h3>Próximos passos</h3>${detailList(qualified.filter(item => item.accuracy < 80).sort((a,b) => a.accuracy-b.accuracy).slice(0,4))}</details>` : ''}${routeLink('arcade/' + game.id, 'Praticar →', 'text-link')}</section>`;
  }).join('');
  ctx.main.innerHTML = `<div class="play-page"><header class="play-heading"><p class="eyebrow">SEU JAPONÊS, EM MOVIMENTO</p><h1 tabindex="-1">Pequenas tentativas. Progresso real.</h1><p>${total ? `${total} respostas e ${Math.round(correct / total * 100)}% de acertos. Continue construindo seu ritmo.` : 'Jogue para descobrir o que já está ficando fácil e o que merece mais atenção.'}</p></header><div class="play-progress-grid">${sections}</div><p class="field-hint only-wide">Pontos fortes: pelo menos 80% de acertos, com 3 ou mais tentativas por item. Os resultados descrevem seus treinos; não são uma certificação de domínio.</p></div>`;
}
