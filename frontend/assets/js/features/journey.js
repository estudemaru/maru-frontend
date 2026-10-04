import { hasKanaFoundation } from "../core/beginner.js";
import { placementResult } from "/shared/placement.js";
import { nextLesson, moduleReadiness } from "/shared/learningPath.js";
import { MODULES, LESSONS } from "/shared/curriculum.js";
import { lessonGameKey } from "/shared/lessonGame.js";
import { videosFor } from "/shared/videos.js";
import { routeLink, icon, progressBar, beginnerText, esc } from "../core/ui.js";

// A trilha como um mapa de linhas de trem (路線図): cada etapa é uma linha colorida,
// cada lição é uma estação e a próxima lição mostra "Você está aqui".
export function renderJourney(ctx, moduleId) {
  const kanaReady = hasKanaFoundation(ctx.progress);
  const next = nextLesson(ctx.progress);
  const isDone = lesson => Boolean(ctx.progress.lessons[lesson.id]?.completedAt);
  const completed = LESSONS.filter(isDone).length;
  const readiness = moduleReadiness(ctx.progress);
  const symbol = module => kanaReady || !/\p{Script=Han}/u.test(module.symbol) ? module.symbol : module.number;
  const nextModule = next && MODULES.find(module => module.id === next.moduleId);
  // No celular só o tempo e o placar do jogo aparecem (mobile-calm.css esconde os .chip-extra).
  const chips = lesson => [`<span>${icon("clock")} ${lesson.minutes} min</span>`, videosFor(lesson.id).length ? `<span class="chip-extra">${icon("play")} vídeo</span>` : "", ctx.progress.arcade?.[lessonGameKey(lesson.id)] ? `<span>${icon("target")} ${ctx.progress.arcade[lessonGameKey(lesson.id)].score} no jogo</span>` : `<span class="chip-extra">${icon("target")} jogo</span>`].filter(Boolean);

  const hero = next
    ? `<section class="trail-next panel"><span class="trail-next-mark jp ${nextModule.color}" lang="ja" aria-hidden="true">${symbol(nextModule)}</span><div class="trail-next-copy"><p class="eyebrow">${completed ? "PRÓXIMA PARADA" : "COMECE AQUI"} · ETAPA ${nextModule.number}</p><h2>${next.title}</h2><p>${esc(beginnerText(next.hook))}</p><p class="trail-chips">${chips(next).join("")}</p></div>${routeLink("lesson/" + next.id, (completed ? "Continuar" : "Dar o primeiro passo") + icon("arrow"), "btn btn-primary")}<div class="trail-next-progress"><span><strong>${completed} de ${LESSONS.length}</strong> lições concluídas</span>${progressBar(completed / LESSONS.length * 100, "Lições concluídas")}</div></section>`
    : `<section class="trail-next panel is-finished"><span class="trail-next-mark jp sage" lang="ja" aria-hidden="true">丸</span><div class="trail-next-copy"><p class="eyebrow">TRILHA COMPLETA</p><h2>Você passou por todas as ${LESSONS.length} lições.</h2><p>Volte a qualquer estação para revisar, ou treine no Arcade.</p></div>${routeLink("practice", "Ir para os jogos" + icon("arrow"), "btn btn-primary")}</section>`;

  const map = `<nav class="trail-map" aria-label="Etapas da trilha">${MODULES.map(module => {
    const done = module.lessons.filter(isDone).length;
    const state = done === module.lessons.length ? "is-done" : module.id === next?.moduleId ? "is-current" : "";
    return `<a class="trail-map-stop ${state} line-${module.id}" href="#/journey/${module.id}"${module.id === next?.moduleId ? ' aria-current="step"' : ""}><span class="trail-map-dot jp" lang="ja">${done === module.lessons.length ? icon("check") : symbol(module)}</span><span class="trail-map-label">${module.title}</span><small>${done}/${module.lessons.length}</small></a>`;
  }).join("")}</nav>`;

  const stations = MODULES.map(module => {
    const done = module.lessons.filter(isDone).length;
    const suggested = ctx.progress.placement.acceptedModule === module.id;
    const suggestionLabel = placementResult(ctx.progress.placement.answers).moduleId === module.id ? "Sugerido para você" : "Escolhido por você";
    const prior = ctx.progress.placement.acceptedModule && MODULES.findIndex(item => item.id === module.id) < MODULES.findIndex(item => item.id === ctx.progress.placement.acceptedModule);
    const notReadyMessage = readiness.find(item => item.id === module.id)?.readyMessage;
    const open = moduleId ? moduleId === module.id : next ? next.moduleId === module.id : false;
    const finished = done === module.lessons.length;
    return `<details class="trail-station line-${module.id} ${finished ? "is-done" : ""}" id="etapa-${module.id}"${matchMedia("(max-width: 820px)").matches ? ' name="trail-stages"' : ""} ${open ? "open" : ""}><summary><span class="module-symbol ${module.color} jp" lang="ja">${symbol(module)}</span><div class="trail-station-copy"><span class="eyebrow">ETAPA ${module.number}${suggested ? `<span class="pill small-pill">${suggestionLabel}</span>` : ""}${notReadyMessage ? `<span class="pill small-pill caution-pill">Recomendado depois</span>` : ""}</span><h2>${module.title}</h2><p class="trail-station-subtitle">${prior ? "Revisão rápida, se quiser · " : ""}${module.subtitle}</p><p class="trail-outcome">${icon("spark")} No fim, você vai ${module.outcome}.</p>${notReadyMessage ? `<p class="muted small">${notReadyMessage}</p>` : ""}</div><span class="trail-station-count" aria-label="${done} de ${module.lessons.length} lições concluídas"><strong>${done}</strong>/${module.lessons.length}</span>${finished ? `<span class="hanko small-hanko jp" aria-label="Etapa concluída">${symbol(module)}</span>` : ""}${icon("down")}</summary>
      <ol class="trail-line">${module.lessons.map((lesson, index) => {
        const complete = isDone(lesson);
        const here = next?.id === lesson.id;
        return `<li class="trail-stop ${complete ? "is-done" : ""} ${here ? "is-next" : ""}"><a class="lesson-row" href="#/lesson/${lesson.id}"${here ? ' aria-current="step"' : ""}><span class="trail-node" aria-hidden="true">${complete ? icon("check") : String(index + 1).padStart(2, "0")}</span><span class="trail-stop-copy"><strong>${lesson.title}${here ? '<span class="pill small-pill here-pill">Você está aqui</span>' : ""}</strong><small>${esc(beginnerText(lesson.hook))}</small><span class="trail-chips">${chips(lesson).join("")}</span></span>${icon("chevron")}</a></li>`;
      }).join("")}</ol></details>`;
  }).join("");

  ctx.main.innerHTML = `<div class="trail-page"><div class="page-heading"><div><p class="eyebrow">SUA TRILHA</p><h1 tabindex="-1">Do zero, com direção.</h1><p class="page-description"><span class="trail-description-wide">${LESSONS.length} lições curtas em ${MODULES.length} etapas, do primeiro som às conversas do dia a dia. Cada uma tem explicação, vídeo, perguntas e um jogo.</span><span class="trail-description-mobile">${LESSONS.length} lições · ${MODULES.length} etapas · no seu ritmo</span></p></div></div>${hero}${map}<p class="trail-placement">${icon("spark")} Já sabe um pouco de japonês? ${routeLink("placement", "Descubra por onde começar", "text-link")}</p><div class="trail-stations">${stations}</div></div>`;

  if (moduleId) requestAnimationFrame(() => document.getElementById("etapa-" + moduleId)?.scrollIntoView({ block: "start", behavior: "instant" }));
}

// Cartão da home: a próxima parada da trilha, a um toque.
export function trailBanner(progress) {
  const next = nextLesson(progress);
  if (!next) return "";
  const module = MODULES.find(item => item.id === next.moduleId);
  const completed = LESSONS.filter(lesson => progress.lessons[lesson.id]?.completedAt).length;
  const mark = hasKanaFoundation(progress) || !/\p{Script=Han}/u.test(module.symbol) ? module.symbol : module.number;
  return `<a class="trail-banner line-${module.id}" href="#/lesson/${next.id}"><span class="trail-next-mark jp ${module.color}" lang="ja" aria-hidden="true">${mark}</span><span class="trail-banner-copy"><span class="eyebrow">SUA TRILHA<span class="only-wide">${completed ? " · PRÓXIMA PARADA" : " · APRENDA DO ZERO"}</span></span><strong>${next.title}</strong><small>${esc(beginnerText(next.hook))}</small></span><span class="trail-banner-count"><strong>${completed}</strong>/${LESSONS.length}<small>lições</small></span><span class="next-stop-go">${icon("arrow")}</span></a>`;
}
