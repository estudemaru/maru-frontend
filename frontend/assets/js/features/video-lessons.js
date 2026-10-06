import { MODULES, moduleLabel } from '/shared/curriculum.js';
import { CHANNELS, VIDEOS, videosFor, videoThumbnail } from '/shared/videos.js';
import { pageHeading, icon, routeLink, esc, wideScreen } from '../core/ui.js';
import { videoPanelHTML, bindVideos } from '../core/videos.js';

const CHANNEL_NOTES = {
  '123': 'Aulas em português sobre escrita, gramática e cultura, com professores japoneses.',
  nanda: 'Séries completas de hiragana e katakana, uma família por aula, e aulas básicas de conversa.',
  pjo: 'Introdução ao hiragana e treinos de leitura, em português.',
  jp101: 'Desafios curtos de hiragana e katakana e um guia das partículas. Em inglês.'
};

// Todas as aulas ligadas à trilha, por unidade. Tocar numa aula a abre no player do topo.
export function renderVideoLessons(ctx) {
  const controller = new AbortController();
  const first = videosFor('h-vowels')[0] || VIDEOS[0];
  const card = video => `<li><button type="button" class="video-option" data-play-video="${video.id}"><img src="${videoThumbnail(video)}" alt="" width="96" height="54" loading="lazy"><span><strong>${esc(video.title)}</strong><small>${esc(CHANNELS[video.channel].name)} · ${video.minutes} min${CHANNELS[video.channel].lang === 'en' ? ' · em inglês' : ''}</small></span></button></li>`;
  ctx.main.innerHTML = pageHeading('ASSISTA, ANOTE, EXPERIMENTE', 'Aulas gratuitas para acompanhar a trilha.', `${VIDEOS.length} aulas públicas no YouTube, quase todas em português, organizadas pelas lições do Maru. Assista um trecho e pratique logo em seguida.`) +
    `<ol class="study-routine only-wide"><li><strong>1. Assista um trecho</strong><span>Uma família de letras por vez.</span></li><li><strong>2. Pause e escreva</strong><span>Copie no papel e diga o som.</span></li><li><strong>3. Teste a memória</strong><span>Faça a lição e jogue o Só mais um.</span></li></ol>
    <div class="video-lessons-player">${videoPanelHTML([first], { eyebrow: 'ASSISTINDO AGORA', heading: 'Escolha uma aula na lista abaixo' })}</div>
    <section class="video-channels"><h2>Os canais</h2><ul>${Object.entries(CHANNELS).map(([id, channel]) => `<li class="panel"><strong>${channel.name}</strong><span class="pill small-pill">${channel.lang === 'en' ? 'Em inglês' : 'Em português'}</span><p class="only-wide">${CHANNEL_NOTES[id]}</p><a class="text-link" href="${channel.url}" target="_blank" rel="noopener noreferrer">Abrir o canal ${icon('external')}<span class="sr-only"> · abre em outra aba</span></a></li>`).join('')}</ul></section>
    <div class="video-modules">${MODULES.map(module => {
      const lessons = module.lessons.filter(lesson => videosFor(lesson.id).length);
      if (!lessons.length) return '';
      return `<details class="video-module panel" ${module.id === 'hiragana' && wideScreen() ? 'open' : ''}><summary><span class="module-symbol ${module.color} jp" lang="ja">${module.number || '+'}</span><span><span class="eyebrow">${moduleLabel(module).toUpperCase()}</span><strong>${module.title}</strong></span><small>${lessons.reduce((sum, lesson) => sum + videosFor(lesson.id).length, 0)} aulas</small>${icon('down')}</summary>${lessons.map(lesson => `<div class="video-lesson-group"><div class="video-lesson-group-head"><h3>${lesson.title}</h3>${routeLink('lesson/' + lesson.id, 'Fazer a lição ' + icon('arrow'), 'text-link')}</div><ul class="video-list">${videosFor(lesson.id).map(card).join('')}</ul></div>`).join('')}</details>`;
    }).join('')}</div>
    <aside class="tip-box only-wide">${icon('pen')}<p>As aulas são de professores e canais independentes, sem ligação com o Maru. Os vídeos são públicos; outros produtos dos canais podem ser pagos. O player só carrega quando você toca no play. ${routeLink('worksheets', 'Preparar folhas para estudar', 'text-link')}</p></aside>`;
  bindVideos(ctx.main, controller.signal, () => ctx.audio.stop());
  return () => controller.abort();
}
