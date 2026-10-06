import { hasKanaFoundation } from "../core/beginner.js";
import { placementResult } from "/shared/placement.js";
import { nextStep, stepRoute, unitStates, unlockHint } from "/shared/learningPath.js";
import { MODULES, LESSONS, UNITS, getModule, moduleLabel } from "/shared/curriculum.js";
import { lessonGameKey } from "/shared/lessonGame.js";
import { videosFor } from "/shared/videos.js";
import { routeLink, icon, progressBar, beginnerText, esc } from "../core/ui.js";

const isExtra = lesson => getModule(lesson.moduleId).extra;
// A unidade da próxima parada, seja uma aula ou o checkpoint.
const stepUnit = step => step && (step.kind === "lesson" ? getModule(step.lesson.moduleId) : step.unit);

// A trilha como um mapa de linhas de trem (路線図): cada unidade é uma linha colorida,
// cada aula é uma estação, o checkpoint fecha a linha e a próxima parada mostra
// "Você está aqui". As unidades abrem uma por vez (shared/learningPath.js); os
// extras ficam abertos, fora da linha principal.
export function renderJourney(ctx, moduleId) {
  const kanaReady = hasKanaFoundation(ctx.progress);
  const step = nextStep(ctx.progress);
  const here = stepUnit(step);
  const isDone = lesson => Boolean(ctx.progress.lessons[lesson.id]?.completedAt);
  const mainLessons = LESSONS.filter(lesson => !isExtra(lesson));
  const completed = mainLessons.filter(isDone).length;
  const units = unitStates(ctx.progress);
  const extras = MODULES.filter(module => module.extra).map(module => ({ ...module, open: true, done: module.lessons.filter(isDone).length }));
  const placed = UNITS.findIndex(unit => unit.id === ctx.progress.placement.acceptedModule);
  const symbol = module => kanaReady || !/\p{Script=Han}/u.test(module.symbol) ? module.symbol : module.number || "+";
  const finished = unit => unit.checkpoint ? unit.passed : !unit.soon && unit.done === unit.lessons.length;
  // No celular só o tempo e o placar do jogo aparecem (mobile-calm.css esconde os .chip-extra).
  const chips = lesson => [`<span>${icon("clock")} ${lesson.minutes} min</span>`, videosFor(lesson.id).length ? `<span class="chip-extra">${icon("play")} vídeo</span>` : "", ctx.progress.arcade?.[lessonGameKey(lesson.id)] ? `<span>${icon("target")} ${ctx.progress.arcade[lessonGameKey(lesson.id)].score} no jogo</span>` : `<span class="chip-extra">${icon("target")} jogo</span>`].filter(Boolean);

  const progress = `<div class="trail-next-progress"><span><strong>${completed} de ${mainLessons.length}</strong> lições concluídas</span>${progressBar(completed / mainLessons.length * 100, "Lições concluídas")}</div>`;
  const hero = !step
    ? `<section class="trail-next panel is-finished"><span class="trail-next-mark jp sage" lang="ja" aria-hidden="true">丸</span><div class="trail-next-copy"><p class="eyebrow">FIM DA TRILHA, POR ENQUANTO</p><h2>Você passou por todas as unidades prontas.</h2><p>As próximas aulas estão sendo escritas. Volte a qualquer estação para revisar, explore os extras ou treine no Arcade.</p></div>${routeLink("practice", "Ir para os jogos" + icon("arrow"), "btn btn-primary")}</section>`
    : step.kind === "checkpoint"
      ? `<section class="trail-next panel"><span class="trail-next-mark jp ${here.color}" lang="ja" aria-hidden="true">${symbol(here)}</span><div class="trail-next-copy"><p class="eyebrow">PRÓXIMA PARADA · ${moduleLabel(here).toUpperCase()}</p><h2>Checkpoint: ${esc(here.title)}</h2><p>Mostre o que você aprendeu nesta unidade e abra a próxima.</p></div>${routeLink(stepRoute(step), "Fazer o checkpoint" + icon("arrow"), "btn btn-primary")}${progress}</section>`
      : `<section class="trail-next panel"><span class="trail-next-mark jp ${here.color}" lang="ja" aria-hidden="true">${symbol(here)}</span><div class="trail-next-copy"><p class="eyebrow">${completed ? "PRÓXIMA PARADA" : "COMECE AQUI"} · ${moduleLabel(here).toUpperCase()}</p><h2>${step.lesson.title}</h2><p>${esc(beginnerText(step.lesson.hook))}</p><p class="trail-chips">${chips(step.lesson).join("")}</p></div>${routeLink(stepRoute(step), (completed ? "Continuar" : "Dar o primeiro passo") + icon("arrow"), "btn btn-primary")}${progress}</section>`;

  const map = `<nav class="trail-map" aria-label="Unidades da trilha">${units.map(unit => {
    const state = finished(unit) ? "is-done" : unit.id === here?.id ? "is-current" : !unit.open ? "is-locked" : unit.soon ? "is-soon" : "";
    const count = unit.soon ? "em breve" : unit.open ? `${unit.done}/${unit.lessons.length}` : "fechada";
    return `<a class="trail-map-stop ${state} line-${unit.id}" href="#/journey/${unit.id}"${unit.id === here?.id ? ' aria-current="step"' : ""}><span class="trail-map-dot jp" lang="ja">${finished(unit) ? icon("check") : unit.open ? symbol(unit) : icon("lock")}</span><span class="trail-map-label">${unit.title}</span><small>${count}</small></a>`;
  }).join("")}</nav>`;

  const lessonStop = (unit, lesson, index) => {
    const complete = isDone(lesson);
    const next = step?.kind === "lesson" && step.lesson.id === lesson.id;
    const copy = `<span class="trail-stop-copy"><strong>${lesson.title}${next ? '<span class="pill small-pill here-pill">Você está aqui</span>' : ""}</strong><small>${esc(beginnerText(lesson.hook))}</small>${unit.open ? `<span class="trail-chips">${chips(lesson).join("")}</span>` : ""}</span>`;
    if (!unit.open) return `<li class="trail-stop is-locked"><span class="lesson-row" aria-disabled="true"><span class="trail-node" aria-hidden="true">${icon("lock")}</span>${copy}</span></li>`;
    return `<li class="trail-stop ${complete ? "is-done" : ""} ${next ? "is-next" : ""}"><a class="lesson-row" href="#/lesson/${lesson.id}"${next ? ' aria-current="step"' : ""}><span class="trail-node" aria-hidden="true">${complete ? icon("check") : String(index + 1).padStart(2, "0")}</span>${copy}${icon("chevron")}</a></li>`;
  };
  const checkpointStop = unit => {
    const saved = ctx.progress.checkpoints[unit.id];
    const next = step?.kind === "checkpoint" && step.unit.id === unit.id;
    const detail = saved?.passedAt ? `Aprovado · melhor nota ${saved.best}%` : saved?.attempts ? `Melhor nota: ${saved.best}%. Com 80%, a próxima unidade abre.` : "Perguntas curtas sobre a unidade. Com 80%, a próxima unidade abre.";
    const copy = `<span class="trail-stop-copy"><strong>Checkpoint${next ? '<span class="pill small-pill here-pill">Você está aqui</span>' : ""}</strong><small>${detail}</small></span>`;
    if (!unit.open) return `<li class="trail-stop trail-checkpoint is-locked"><span class="lesson-row" aria-disabled="true"><span class="trail-node" aria-hidden="true">${icon("lock")}</span>${copy}</span></li>`;
    return `<li class="trail-stop trail-checkpoint ${unit.passed ? "is-done" : ""} ${next ? "is-next" : ""}"><a class="lesson-row" href="#/checkpoint/${unit.id}"${next ? ' aria-current="step"' : ""}><span class="trail-node" aria-hidden="true">${icon(unit.passed ? "check" : "target")}</span>${copy}${icon("chevron")}</a></li>`;
  };

  const station = unit => {
    const index = UNITS.findIndex(item => item.id === unit.id);
    const suggested = !unit.extra && ctx.progress.placement.acceptedModule === unit.id;
    const suggestionLabel = placementResult(ctx.progress.placement.answers).moduleId === unit.id ? "Sugerido para você" : "Escolhido por você";
    const prior = !unit.extra && placed > index;
    const open = moduleId ? moduleId === unit.id : here?.id === unit.id;
    const done = unit.extra ? unit.done === unit.lessons.length : finished(unit);
    const pills = [suggested ? `<span class="pill small-pill">${suggestionLabel}</span>` : "", !unit.open ? `<span class="pill small-pill">${icon("lock")} Fechada</span>` : "", unit.soon ? `<span class="pill small-pill">Em breve</span>` : ""].join("");
    const body = unit.soon
      ? `<p class="trail-soon">As aulas desta unidade estão sendo escritas. Enquanto isso, a trilha segue para a próxima.</p>`
      : `${unit.open ? "" : `<p class="trail-locked-note">${icon("lock")}<span>${esc(unlockHint(ctx.progress, unit.id))}</span></p>`}<ol class="trail-line">${unit.lessons.map((lesson, i) => lessonStop(unit, lesson, i)).join("")}${unit.checkpoint ? checkpointStop(unit) : ""}</ol>`;
    return `<details class="trail-station line-${unit.id} ${done ? "is-done" : ""} ${unit.open ? "" : "is-locked"}" id="unidade-${unit.id}"${matchMedia("(max-width: 820px)").matches ? ' name="trail-stages"' : ""} ${open ? "open" : ""}><summary><span class="module-symbol ${unit.color} jp" lang="ja">${unit.open ? symbol(unit) : icon("lock")}</span><div class="trail-station-copy"><span class="eyebrow">${moduleLabel(unit).toUpperCase()}${pills}</span><h2>${unit.title}</h2><p class="trail-station-subtitle">${prior ? "Revisão rápida, se quiser · " : ""}${unit.subtitle}</p><p class="trail-outcome">${icon("spark")} No fim, você vai ${unit.outcome}.</p></div>${unit.soon ? "" : `<span class="trail-station-count" aria-label="${unit.done} de ${unit.lessons.length} lições concluídas"><strong>${unit.done}</strong>/${unit.lessons.length}</span>`}${done ? `<span class="hanko small-hanko jp" aria-label="${unit.extra ? "Extra concluído" : "Unidade concluída"}">${symbol(unit)}</span>` : ""}${icon("down")}</summary>${body}</details>`;
  };

  ctx.main.innerHTML = `<div class="trail-page"><div class="page-heading"><div><p class="eyebrow">SUA TRILHA</p><h1 tabindex="-1">Do zero, com direção.</h1><p class="page-description"><span class="trail-description-wide">${mainLessons.length} lições curtas em ${UNITS.length} unidades, do primeiro som às conversas do dia a dia. Cada unidade termina num checkpoint, que abre a seguinte.</span><span class="trail-description-mobile">${mainLessons.length} lições · ${UNITS.length} unidades · no seu ritmo</span></p></div></div>${hero}${map}<p class="trail-placement">${icon("spark")} Já sabe um pouco de japonês? ${routeLink("placement", "Descubra por onde começar", "text-link")}</p><div class="trail-stations">${units.map(station).join("")}</div><section class="trail-extras" aria-labelledby="trail-extras-title"><h2 id="trail-extras-title">Extras · sempre abertos</h2><p>Para ir além da linha principal, quando quiser. Sem checkpoint.</p><div class="trail-stations">${extras.map(station).join("")}</div></section></div>`;

  if (moduleId) requestAnimationFrame(() => document.getElementById("unidade-" + moduleId)?.scrollIntoView({ block: "start", behavior: "instant" }));
}

// Cartão da home: a próxima parada da trilha, a um toque.
export function trailBanner(progress) {
  const step = nextStep(progress);
  if (!step) return "";
  const module = stepUnit(step);
  const completed = LESSONS.filter(lesson => !isExtra(lesson) && progress.lessons[lesson.id]?.completedAt).length;
  const total = LESSONS.filter(lesson => !isExtra(lesson)).length;
  const mark = hasKanaFoundation(progress) || !/\p{Script=Han}/u.test(module.symbol) ? module.symbol : module.number;
  const title = step.kind === "lesson" ? step.lesson.title : "Checkpoint: " + esc(module.title);
  const detail = step.kind === "lesson" ? esc(beginnerText(step.lesson.hook)) : "Mostre o que aprendeu e abra a próxima unidade.";
  return `<a class="trail-banner line-${module.id}" href="#/${stepRoute(step)}"><span class="trail-next-mark jp ${module.color}" lang="ja" aria-hidden="true">${mark}</span><span class="trail-banner-copy"><span class="eyebrow">SUA TRILHA<span class="only-wide">${completed ? " · PRÓXIMA PARADA" : " · APRENDA DO ZERO"}</span></span><strong>${title}</strong><small>${detail}</small></span><span class="trail-banner-count"><strong>${completed}</strong>/${total}<small>lições</small></span><span class="next-stop-go">${icon("arrow")}</span></a>`;
}
