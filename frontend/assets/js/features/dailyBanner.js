import { DAILY_STEPS, dailyStreak } from '/shared/daily.js';
import { localDay } from '/shared/progress.js';
import { esc, icon } from '../core/ui.js';

// O cartão do desafio do dia (início e Arcade) mora fora da tela do desafio: assim o
// início não baixa o catálogo de voz, que só a tela usa.
export const dateLabel = day => new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
export const stars = score => `<span class="daily-stars" aria-label="${score} de ${DAILY_STEPS} passos certos">${Array.from({ length: DAILY_STEPS }, (_, i) => `<span class="${i < score ? 'is-on' : ''}" aria-hidden="true">★</span>`).join('')}</span>`;

// Folha de calendário de destacar (日めくり): mês, dia e o dia da semana em kanji.
export const calendarPage = day => {
  const date = new Date(`${day}T12:00:00`);
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `<span class="daily-cal" aria-hidden="true"><span class="daily-cal-month">${esc(month)}</span><b>${date.getDate()}</b><span class="daily-cal-weekday" lang="ja">${'日月火水木金土'[date.getDay()]}曜日</span></span>`;
};

// Cartão da home: não revela a palavra antes de jogar.
export function dailyBanner(progress, day = localDay()) {
  const done = progress.daily?.[day];
  const streak = dailyStreak(progress, day);
  return `<a class="play-daily ${done?.completedAt ? 'is-done' : ''}" href="#/daily">${calendarPage(day)}<span class="play-daily-date"><small>DESAFIO DO DIA</small><strong>${esc(dateLabel(day))}</strong></span><span class="play-daily-copy"><strong>${done?.completedAt ? `Feito! ${stars(done.score)}` : 'Uma palavra, três passos.'}</strong><span>${done?.completedAt ? 'Volte amanhã para uma palavra nova.' : 'Reconheça, escreva e use numa frase. Leva um minuto.'}${streak ? ` · ${icon('fire')} ${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}` : ''}</span></span><span class="play-daily-go">${done?.completedAt ? 'Rever' : 'Começar'} ${icon('arrow')}</span></a>`;
}
