import { DAILY_STEPS, dailySteps, dailyWord, checkWrite, recordDaily, dailyStreak } from '/shared/daily.js';
import { localDay } from '/shared/progress.js';
import { esc, icon, routeLink, audioButton } from '../core/ui.js';
import { getPronunciation } from '/shared/pronunciation.js';

const dateLabel = day => new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
const stars = score => `<span class="daily-stars" aria-label="${score} de ${DAILY_STEPS} passos certos">${Array.from({ length: DAILY_STEPS }, (_, i) => `<span class="${i < score ? 'is-on' : ''}" aria-hidden="true">★</span>`).join('')}</span>`;
const speak = text => getPronunciation(text) ? audioButton(text, `Ouvir ${text}`) : '';

// Cartão da home: não revela a palavra antes de jogar.
export function dailyBanner(progress, day = localDay()) {
  const done = progress.daily?.[day];
  const streak = dailyStreak(progress, day);
  return `<a class="play-daily ${done?.completedAt ? 'is-done' : ''}" href="#/daily"><span class="play-daily-date"><small>DESAFIO DO DIA</small><strong>${esc(dateLabel(day))}</strong></span><span class="play-daily-copy"><strong>${done?.completedAt ? `Feito! ${stars(done.score)}` : 'Uma palavra, três passos.'}</strong><span>${done?.completedAt ? 'Volte amanhã para uma palavra nova.' : 'Reconheça, escreva e use numa frase. Leva um minuto.'}${streak ? ` · ${icon('fire')} ${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}` : ''}</span></span><span class="play-daily-go">${done?.completedAt ? 'Rever' : 'Começar'} ${icon('arrow')}</span></a>`;
}

export function renderDaily(ctx) {
  const controller = new AbortController();
  const day = localDay();
  const word = dailyWord(day);
  const steps = dailySteps(day);
  let index = 0, results = [], feedback = null, practice = false, hinted = false;
  const saved = () => ctx.progress.daily?.[day];
  const header = () => `<div class="play-session-heading">${routeLink('practice', '← Todos os jogos', 'text-link')}<span class="play-tag">DESAFIO DO DIA · ${esc(dateLabel(day)).toUpperCase()}</span></div>`;

  function summary(score, fresh) {
    const streak = dailyStreak(ctx.progress, day);
    ctx.main.innerHTML = `<div class="play-page play-results daily">${header()}<div class="play-result-hero"><p class="eyebrow">${fresh ? 'DESAFIO CONCLUÍDO' : practice ? 'TREINO LIVRE' : 'SEU RESULTADO DE HOJE'}</p><h1 tabindex="-1">${score === DAILY_STEPS ? 'Três de três!' : score ? `${score} de ${DAILY_STEPS}. Amanhã tem mais.` : 'Hoje foi de aprender.'}</h1>${stars(score)}<p>${practice ? 'Este treino não altera o resultado de hoje.' : streak > 1 ? `${streak} dias seguidos de desafio. Continue assim.` : 'Uma palavra nova aparece todo dia, à meia-noite.'}</p></div>
      <section class="panel daily-word"><div class="daily-word-main"><span class="daily-word-jp" lang="ja">${esc(word.jp)}</span>${word.jp !== word.reading ? `<span lang="ja">${esc(word.reading)}</span>` : ''}${speak(word.jp)}</div><p><b>${esc(word.pt)}</b> · ${esc(word.romaji)}</p><p class="daily-sentence"><span lang="ja">${esc(word.sentence)}</span> ${speak(word.sentence)}<br><small lang="ja">${esc(word.sentenceReading)}</small><br>${esc(word.translation)}</p>${word.note ? `<p class="field-hint">${esc(word.note)}</p>` : ''}</section>
      <div class="play-actions"><button class="btn btn-primary" id="daily-practice">Treinar de novo</button>${routeLink('arcade/karuta', 'Ouvir mais palavras', 'btn btn-ghost')}${routeLink('home', 'Voltar ao início', 'text-link')}</div></div>`;
    ctx.main.querySelector('h1')?.focus();
  }

  function draw() {
    const step = steps[index];
    const answered = Boolean(feedback);
    const choice = value => `<button class="play-choice daily-choice ${answered && value === step.answer ? 'is-right' : answered && value === feedback.value ? 'is-wrong' : ''}" type="button" data-daily-choice="${esc(value)}" ${step.kind === 'use' ? 'lang="ja"' : ''} ${answered ? 'disabled' : ''}>${esc(value)}</button>`;
    const body = step.kind === 'meaning'
      ? `<p class="play-prompt play-prompt-short" lang="ja">${esc(step.prompt)}</p>${step.prompt !== step.reading ? `<p class="daily-reading" lang="ja">${esc(step.reading)}</p>` : ''}<div class="daily-choices">${step.choices.map(choice).join('')}</div>`
      : step.kind === 'write'
        ? `<p class="play-prompt">${esc(step.prompt)}</p>${hinted ? `<p class="daily-reading">Dica: ${esc(step.hint)}</p>` : ''}<form id="daily-form" autocomplete="off"><label class="sr-only" for="daily-answer">Sua resposta em japonês</label><input class="text-input play-answer" id="daily-answer" name="answer" placeholder="Escreva em japonês…" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40" ${answered ? 'disabled' : ''}><button class="btn btn-primary" ${answered ? 'disabled' : ''}>Conferir ${icon('arrow')}</button></form>${!answered && !hinted ? '<button class="text-link play-skip" id="daily-hint" type="button">Mostrar o romaji · o passo não conta ponto</button>' : ''}`
        : `<p class="play-prompt daily-blank" lang="ja">${esc(step.before)}<span class="daily-gap">${answered ? esc(step.answer) : '＿＿'}</span>${esc(step.after)}</p><p class="daily-reading">${esc(step.translation)}</p><div class="daily-choices">${step.choices.map(choice).join('')}</div>`;
    const next = index + 1 < steps.length ? `Próximo passo ${icon('arrow')}` : `Ver resultado ${icon('arrow')}`;
    ctx.main.innerHTML = `<div class="play-page play-session daily">${header()}<ol class="daily-progress" aria-label="Passos do desafio">${steps.map((item, i) => `<li class="${i < index ? (results[i] ? 'is-right' : 'is-wrong') : i === index ? 'is-current' : ''}" ${i === index ? 'aria-current="step"' : ''}><span>${i + 1}</span> ${item.title}</li>`).join('')}</ol>
      <section class="play-question"><p class="eyebrow">${esc(step.question.toUpperCase())}</p><h1 class="sr-only" tabindex="-1">Desafio do dia · passo ${index + 1} de ${steps.length}</h1>${body}
      <div id="daily-feedback" aria-live="polite">${answered ? `<div class="play-feedback ${feedback.correct ? 'correct' : 'incorrect'}"><strong>${feedback.correct ? 'Isso!' : hinted && step.kind === 'write' && feedback.right ? 'Certo, com ajuda da dica.' : 'Guarde esta.'}</strong><p><b lang="ja">${esc(word.jp)}</b>${word.jp !== word.reading ? ` <span lang="ja">(${esc(word.reading)})</span>` : ''} · ${esc(word.romaji)} · ${esc(word.pt)}</p>${step.kind === 'use' ? `<p lang="ja">${esc(step.sentenceReading)}</p>` : ''}<button class="btn btn-primary" id="daily-next">${next}</button></div>` : ''}</div></section>
      <p class="play-session-note">${practice ? 'Treino livre · o resultado de hoje não muda' : 'Só a primeira tentativa do dia fica registrada'}</p></div>`;
    if (answered) ctx.main.querySelector('#daily-next')?.focus({ preventScroll: true });
    else (ctx.main.querySelector('#daily-answer') || ctx.main.querySelector('.daily-choice'))?.focus({ preventScroll: true });
  }

  function answer(value) {
    if (feedback) return;
    const step = steps[index];
    const right = step.kind === 'write' ? checkWrite(step, value) : value === step.answer;
    if (step.kind === 'write' && !right && !String(value).trim()) return;
    // A dica do romaji ajuda a completar, mas o passo não conta ponto.
    const correct = right && !(step.kind === 'write' && hinted);
    results[index] = correct; feedback = { correct, right, value };
    ctx.audio.feedback(correct ? 'correct' : 'incorrect');
    draw();
  }
  function advance() {
    if (!feedback) return;
    index++; feedback = null; hinted = false;
    if (index < steps.length) return draw();
    const score = results.filter(Boolean).length;
    const fresh = !practice && recordDaily(ctx.progress, day, score);
    if (fresh) ctx.save();
    ctx.audio.feedback('complete');
    summary(practice ? score : saved()?.score ?? score, fresh);
  }
  function begin(asPractice) { practice = asPractice; index = 0; results = []; feedback = null; hinted = false; draw(); }

  ctx.main.addEventListener('submit', event => {
    if (event.target.id !== 'daily-form') return;
    event.preventDefault(); answer(event.target.elements.answer.value);
  }, { signal: controller.signal });
  ctx.main.addEventListener('keydown', event => { if (event.isComposing && event.key === 'Enter') event.preventDefault(); }, { signal: controller.signal });
  ctx.main.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.dailyChoice !== undefined) answer(button.dataset.dailyChoice);
    if (button.id === 'daily-hint') { hinted = true; draw(); }
    if (button.id === 'daily-next') advance();
    if (button.id === 'daily-practice') begin(true);
  }, { signal: controller.signal });
  if (saved()?.completedAt) { practice = false; summary(saved().score, false); }
  else begin(false);
  return () => controller.abort();
}
