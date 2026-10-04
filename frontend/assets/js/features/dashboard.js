import { GAMES } from '/shared/arcade.js';
import { dailyBanner } from './daily.js';
import { nextLesson } from '/shared/learningPath.js';
import { esc, icon, routeLink } from '../core/ui.js';

// Folhas do bambu da capa: [x, y, rotação, escala] no desenho de 520 × 500.
const LEAVES = [[91, 241, -78, 1], [91, 243, -108, .85], [91, 243, -50, .8], [120, 241, -18, 1], [119, 242, -50, .85], [104, 251, -72, .7], [55, 252, -155, 1], [56, 253, -122, .85], [71, 262, -105, .7], [124, 287, -6, 1], [123, 288, -36, .85], [107, 294, 28, .7], [40, 306, -172, 1], [41, 307, -142, .85], [58, 316, 152, .7], [124, 345, 8, 1], [123, 345, -24, .85], [102, 347, -50, .7]];
// Capa: a paisagem em tinta vista por uma janela redonda (丸窓). As cores vêm do tema (themes/wagara.css),
// então o mesmo desenho mostra o sol vermelho de dia e a lua, as estrelas e as montanhas azuladas à noite.
// Sol, névoa, pássaros e ondas ficam em camadas próprias para animar sem redesenhar o pincel.
const HERO_SCENE = `<div class="hero-window"><div class="hero-view"><span class="hero-stars">${'<i></i>'.repeat(7)}</span><span class="hero-sun"></span><svg class="hero-yama" viewBox="0 0 520 500" fill="none" focusable="false"><defs><linearGradient id="yama-far" x1="260" y1="160" x2="260" y2="420" gradientUnits="userSpaceOnUse"><stop class="yama-far" stop-opacity=".28"/><stop class="yama-far" offset="1" stop-opacity="0"/></linearGradient><linearGradient id="yama-near" x1="180" y1="200" x2="240" y2="420" gradientUnits="userSpaceOnUse"><stop class="yama-near" stop-opacity=".64"/><stop class="yama-near" offset="1" stop-opacity=".04"/></linearGradient><filter id="yama-brush" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="3" seed="12" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="4"/></filter><path id="yama-leaf" d="M0 0C7-5 19-6 29-1.5 19 2.5 8 3.5 0 0Z"/></defs><g filter="url(#yama-brush)"><path d="M80 357 153 268 188 301 293 151 335 214 363 201 456 364Z" fill="url(#yama-far)"/><path d="m20 403 81-83 38 14 77-141 36 82 27-13 74 142Z" fill="url(#yama-near)"/><path class="yama-ridge" d="m196 227 20-34 36 82-18-10-12-39-10 27Z" opacity=".48"/><path class="yama-ridge" d="m288 164 5-13 42 63-18-9-9-30-10 7Z" opacity=".32"/><path class="yama-water" d="M85 376c63-24 127-2 205-16s141-13 178 1" stroke-opacity=".18" stroke-width="2"/><path class="yama-water" d="M128 394c72-10 97 1 162-3m-100 18c80-7 98 4 152-6" stroke-opacity=".24"/><g class="yama-tree"><path d="M68 408c13-56 7-108 23-167m-5 23c16-8 21-19 34-23m-35 41c-11-19-16-23-30-30m28 53c19-7 31-17 41-18m-45 48c-17-13-27-27-39-29m38 49c21-5 29-12 46-10" stroke-width="3" stroke-linecap="round"/>${LEAVES.map(([x, y, r, s]) => `<use href="#yama-leaf" transform="translate(${x} ${y}) rotate(${r})${s === 1 ? '' : ` scale(${s})`}"/>`).join('')}</g></g></svg><span class="hero-kasumi"></span><span class="hero-kasumi"></span><svg class="hero-birds" viewBox="0 0 520 500" fill="none" focusable="false"><path d="M369 249c8-8 13-8 18-1 5-7 11-8 17-4"/><path d="M334 218c4-4 8-5 11-1 3-4 7-5 11-2"/></svg><span class="hero-waves"></span></div></div>`;
const HERO_BADGE = `<span class="hero-badge"><svg viewBox="0 0 100 100"><defs><path id="hero-badge-ring" d="M50,50 m-40,0 a40,40 0 1,1 80,0 a40,40 0 1,1 -80,0"/></defs><text><textPath href="#hero-badge-ring" textLength="244" lengthAdjust="spacing">JAPONÊS NO SEU RITMO ✦ まいにち ✦</textPath></text></svg><b lang="ja">丸</b></span>`;

export function renderDashboard(ctx) {
  const next = nextLesson(ctx.progress);
  const started = Object.values(ctx.progress.lessons).some(lesson => lesson.completedAt);
  const startLabel = next ? started ? 'Continuar minha trilha' : 'Começar minha trilha' : 'Rever minha trilha';
  const games = GAMES.filter(game => ['renda', 'pictures'].includes(game.id));
  ctx.main.innerHTML = `<div class="play-page home-page">
    <section class="play-hero">
      <div class="play-hero-copy">
        <h1 tabindex="-1"><span class="hero-line">Um traço.</span> <em class="hero-line">Um novo começo.</em></h1>
        <p>Um pouquinho de japonês. No seu ritmo.</p>
        <div class="play-actions">${routeLink(next ? 'lesson/' + next.id : 'journey', startLabel + icon('arrow'), 'btn btn-primary home-start')}</div>
      </div>
      <div class="play-hero-art" aria-hidden="true"><div class="book-scene">${HERO_BADGE}${HERO_SCENE}</div><span class="hero-petals">${'<i></i>'.repeat(8)}</span></div>
    </section>
    <section class="play-games" aria-labelledby="home-practice-title">
      <div class="play-section-title"><h2 id="home-practice-title">Para praticar.</h2>${routeLink('practice', 'Ver todos ' + icon('arrow'), 'text-link home-all-games', 'aria-label="Ver todos os jogos"')}</div>
      <div class="play-grid">${games.map(game => `<a class="play-card home-game ${game.color}" href="#/arcade/${game.id}"><div class="play-card-art"><img src="/assets/img/irasutoya-${game.image}.png" width="96" height="96" alt=""><span class="play-arrow" aria-hidden="true">↗</span></div><div class="play-card-copy"><span class="play-subtitle">${game.id === 'renda' ? 'Kana com um toque' : 'Palavras por imagens'}</span><h3>${esc(game.title)}</h3></div></a>`).join('')}</div>
    </section>
    ${dailyBanner(ctx.progress)}
  </div>`;
}
