import { CULTURE_CAPSULES } from "/shared/discovery.js";
import { conceptsIn } from "/shared/glossary.js";
import { getLesson, getModule, getTheme, moduleLabel } from "/shared/curriculum.js";
import { isLessonOpen, stepAfter, stepRoute } from "/shared/learningPath.js";
import { completeLesson } from "/shared/progress.js";
import { personalBest } from "/shared/arcade.js";
import { lessonGameKey, lessonGameKind, LESSON_GAME_KINDS } from "/shared/lessonGame.js";
import { videosFor } from "/shared/videos.js";
import { mountLessonGame } from "./lessonGame.js";
import { lockedPanel } from "./checkpoint.js";
import { readingScene, lessonArt, lessonArtCredit, illustratedExampleHTML } from "./lessonScenes.js";
import { videoPanelHTML, bindVideos } from "../core/videos.js";
import { esc, icon, routeLink, progressBar, exampleHTML, emptyState, beginnerText, richText } from "../core/ui.js";

// Um caractere de kana com dica de memória vira um cartão grande, que toca o som ao ser tocado.
const isKanaTile = example => example.note && /^[ぁ-ゖァ-ヺ]{1,2}$/u.test(example.jp);
function kanaTile(example, romaji) {
  const sound = romaji ? `<strong>${esc(example.romaji)}</strong>` : `<button type="button" class="kana-tile-reveal" data-reveal="${esc(example.romaji)}">Mostrar o som</button>`;
  const detail = example.pt && example.pt !== example.romaji ? `<span>${esc(example.pt)}</span>` : "";
  return `<article class="kana-tile"><button type="button" class="kana-tile-char${example.jp.length > 1 ? " is-pair" : ""}" data-speak="${esc(example.jp)}" aria-label="Ouvir ${esc(example.jp)}"><span class="jp" lang="ja">${esc(example.jp)}</span><span class="kana-tile-speaker">${icon("volume")}<span>Ouvir</span></span></button><div class="kana-tile-body"><p class="kana-tile-sound">${sound}${detail}</p><p class="kana-tile-hint"><span>Dica de memória</span>${esc(beginnerText(example.note))}</p>${example.jp.length === 1 ? `<a class="kana-tile-write" href="#/writing/${encodeURIComponent(example.jp)}">${icon("pen")} Ver os traços</a>` : ""}</div></article>`;
}
const examplesHTML = (examples, romaji) => !examples.length ? "" : examples.every(isKanaTile)
  ? `<section class="kana-deck" aria-label="Cartas de kana"><div class="lesson-examples-head"><span>${icon("volume")} Explore os sons</span><small class="kana-deck-position" aria-live="polite" aria-atomic="true">1 de ${examples.length}</small></div><div class="kana-deck-picker" role="group" aria-label="Escolher uma carta">${examples.map((example, index) => `<button type="button" data-kana-card="${index}" aria-label="Ver carta ${index + 1}: ${esc(example.jp)}" aria-pressed="${index === 0}" aria-controls="lesson-kana-cards"><span class="jp" lang="ja">${esc(example.jp)}</span></button>`).join("")}</div><div class="kana-tiles" id="lesson-kana-cards">${examples.map(example => kanaTile(example, romaji)).join("")}</div><p class="kana-deck-hint">Toque para ouvir · deslize para ver a próxima carta</p></section>`
  : `<section class="lesson-examples" aria-label="Exemplos em japonês"><div class="lesson-examples-head"><span>${icon("chat")} Veja em japonês</span><small>Toque em ${icon("volume")} para ouvir</small></div><div class="examples-grid${examples.length > 1 && examples.every(example => example.jp.length <= 6 && !example.note) ? " is-compact" : ""}">${examples.map(example => illustratedExampleHTML(example, romaji)).join("")}</div></section>`;

// Letras que o tema da lição já apresentou até ela, para o treino "Só mais um".
function trainingScope(lesson) {
  if (lesson.theme === "kanji") return { script: "kanji" };
  if (!["hiragana", "katakana"].includes(lesson.theme)) return null;
  const theme = getTheme(lesson.theme);
  const seen = theme.lessons.slice(0, theme.lessons.findIndex(item => item.id === lesson.id) + 1);
  const rows = [...new Set(seen.flatMap(item => item.practice?.rows || []))];
  const groups = [...new Set(seen.flatMap(item => item.practice?.group ? [item.practice.group] : []))];
  return rows.length ? { script: lesson.theme, rows, groups } : { script: lesson.theme };
}

export function renderLesson(ctx, id) {
  const source = getLesson(id);
  if (!source) { ctx.main.innerHTML = emptyState("Lição não encontrada", "Escolha uma lição na sua trilha.", routeLink("journey", "Ver a trilha")); return; }
  if (!isLessonOpen(ctx.progress, id)) { ctx.main.innerHTML = `<div class="lesson-locked">${lockedPanel(ctx.progress, getModule(source.moduleId))}</div>`; return; }
  const lesson = { ...source, goal: beginnerText(source.goal), hook: beginnerText(source.hook), sections: source.sections.map(section => ({ ...section, title: beginnerText(section.title), body: section.body.split("\n").map(beginnerText).join("\n"), tip: section.tip && beginnerText(section.tip) })), quiz: source.quiz.map(question => ({ ...question, prompt: beginnerText(question.prompt), choices: question.choices.map(beginnerText), explanation: beginnerText(question.explanation) })) };
  const module = getModule(lesson.moduleId);
  const videos = videosFor(id);
  // Passos: abertura, uma parte por seção, perguntas, jogo e conclusão.
  const SECTIONS = lesson.sections.length, QUIZ = SECTIONS + 1, GAME = SECTIONS + 2, DONE = SECTIONS + 3;
  let step = 0;
  let queue = lesson.quiz.map((_, i) => i);
  let questionIndex = 0;
  let missed = [];
  let feedback = null;
  let awarded = false;
  // Depois das perguntas vem o jogo da lição; a conclusão (e o XP) já fica registrada antes dele.
  let gameResult = null, unmountGame = null;
  const controller = new AbortController();
  const focus = () => ctx.main.querySelector("[data-focus]")?.focus({ preventScroll: true });
  const position = `${moduleLabel(module).toUpperCase()} · LIÇÃO ${String(lesson.index + 1).padStart(2, "0")} DE ${String(module.lessons.length).padStart(2, "0")}`;
  const shell = content => {
    const progress = step >= DONE ? 100 : (step + (step === QUIZ ? questionIndex / queue.length : 0)) / DONE * 100;
    const phase = step === 0 ? "intro" : step <= SECTIONS ? "reading" : step === QUIZ ? "quiz" : step === GAME ? "game" : "done";
    const currentStage = step < QUIZ ? 0 : step === QUIZ ? 1 : 2;
    const stages = [{ title: "Aprender", icon: "book" }, { title: "Praticar", icon: "pen" }, { title: "Jogar", icon: "target" }];
    const stageBar = `<ol class="lesson-stages" aria-label="Etapas da lição">${stages.map((item, index) => `<li class="${step >= DONE || index < currentStage ? "is-done" : index === currentStage ? "is-current" : ""}"${step < DONE && index === currentStage ? ' aria-current="step"' : ""}>${icon(step >= DONE || index < currentStage ? "check" : item.icon)}<span>${item.title}</span></li>`).join("")}</ol>`;
    ctx.main.innerHTML = `<div class="lesson-reader" data-lesson-phase="${phase}"${["reading", "quiz", "game"].includes(phase) ? ' data-lesson-active' : ''} style="--lesson-accent:var(--line-${lesson.moduleId})">${routeLink("journey/" + lesson.moduleId, icon("back") + `<span class="lesson-back-copy">${lesson.moduleTitle}</span>`, "back-link", `aria-label="Voltar à trilha: ${esc(lesson.moduleTitle)}"`)}<div class="lesson-reader-head"><div><p class="eyebrow">${position}</p><h1 tabindex="-1">${lesson.title}</h1></div><span class="pill">${icon("clock")} ${lesson.minutes} min</span></div>${progressBar(progress, "Progresso da lição")}${stageBar}<div class="lesson-content panel">${content}</div>${lessonArtCredit}</div>`;
  };
  const recapHTML = () => source.recap.length ? `<aside class="lesson-recap"><p class="eyebrow">RESUMINDO</p><ul>${source.recap.map(item => `<li>${esc(beginnerText(item))}</li>`).join("")}</ul></aside>` : "";
  function intro() {
    const game = LESSON_GAME_KINDS[lessonGameKind(source)];
    shell(`<div class="lesson-intro"><div class="lesson-scene is-intro"><div class="lesson-scene-copy"><span class="step-label">ANTES DE COMEÇAR</span><h2 data-focus tabindex="-1">${esc(lesson.hook)}</h2></div>${lessonArt(readingScene(lesson.sections.flatMap(part => part.examples)))}</div>
      <ul class="lesson-plan"><li>${icon("book")}<span><strong>${SECTIONS} ${SECTIONS === 1 ? "parte curta" : "partes curtas"}</strong> para ler e ouvir</span></li><li>${icon("check")}<span><strong>${lesson.quiz.length} perguntas</strong> com explicação</span></li><li>${icon("target")}<span><strong>Jogo: ${game}</strong> com os exemplos da lição</span></li></ul>
      <p class="lesson-goal"><strong>No fim, você vai</strong> ${esc(lesson.goal.charAt(0).toLowerCase() + lesson.goal.slice(1))}</p>
      ${videos.length ? `<details class="lesson-video"${matchMedia("(min-width: 821px)").matches ? " open" : ""}><summary>${icon("play")}<span>Vídeo de apoio<small>Opcional · veja quando quiser</small></span>${icon("down")}</summary>${videoPanelHTML(videos)}</details>` : ""}
      <div class="lesson-controls"><span class="small muted">${videos.length ? "O vídeo é opcional: dá para ir direto à leitura." : "Leia, ouça e experimente."}</span><button class="btn btn-primary" data-lesson="next">Começar a lição ${icon("arrow")}</button></div></div>`);
  }
  function section(index) {
    const part = lesson.sections[index];
    const last = index === SECTIONS - 1;
    const capsule = last ? CULTURE_CAPSULES.find(item => item.lessonId === id) : null;
    const concepts = conceptsIn(part.body + " " + part.title);
    const examples = examplesHTML(part.examples, ctx.progress.preferences.romaji);
    const body = `<div class="lesson-body">${richText(part.body)}</div>`;
    const teaching = part.examples.length && part.examples.every(isKanaTile) ? examples + body : body + examples;
    const help = concepts.length ? `<details class="concept-help"><summary>Em outras palavras · termos desta explicação</summary><dl>${concepts.map(item => `<dt>${item.term}</dt><dd>${esc(beginnerText(item.definition))}<small>${esc(beginnerText(item.example))}</small></dd>`).join("")}</dl></details>` : "";
    shell(`<div class="lesson-scene"><div class="lesson-scene-copy"><span class="step-label">PARTE ${index + 1} DE ${SECTIONS}</span><h2 data-focus tabindex="-1">${part.title}</h2></div>${lessonArt(readingScene(part.examples))}</div>${teaching}${part.tip ? `<aside class="maru-tip"><img src="/assets/img/maru-mark.svg" alt="" width="34" height="34"><div><strong>Dica do Maru</strong><p>${part.tip}</p></div></aside>` : ""}${help}${capsule ? `<aside class="culture-capsule"><p class="eyebrow">JAPONÊS EM CONTEXTO</p><h3>${capsule.title}</h3>${exampleHTML(capsule.expression, ctx.progress.preferences.romaji)}<p>${esc(beginnerText(capsule.expression.context))}</p>${routeLink("expressions", "Conhecer mais expressões " + icon("arrow"), "text-link")}</aside>` : ""}${last ? recapHTML() : ""}<div class="lesson-controls"><button class="btn btn-ghost" data-lesson="back">${icon("back")} Voltar</button><span class="small muted">${last ? "Agora é com você." : "Leia, ouça e experimente."}</span><button class="btn btn-primary" data-lesson="next">${last ? "Praticar o que aprendi" : "Continuar"} ${icon("arrow")}</button></div>`);
  }
  function quiz() {
    const question = lesson.quiz[queue[questionIndex]];
    const excerpts = [...new Set(question.prompt.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]+/gu) || [])];
    const cue = excerpts.length === 1 && [...excerpts[0]].length <= 12 ? excerpts[0] : null;
    shell(`<div class="lesson-question-head"><div class="lesson-question-scene">${lessonArt(feedback ? feedback.correct ? "idea" : "think" : "study")}<span class="lesson-question-mark ${cue ? "jp" : ""}${cue && [...cue].length > 2 ? " is-phrase" : ""}"${cue ? ' lang="ja"' : ' aria-hidden="true"'}>${cue ? esc(cue) : icon("target")}</span></div><div><span class="step-label">SUA VEZ · ${questionIndex + 1} DE ${queue.length}</span><h2 data-focus tabindex="-1">${esc(question.prompt)}</h2><p>Escolha uma resposta. Errar faz parte do aprendizado.</p></div></div><form id="lesson-answer"><fieldset class="answer-options" ${feedback ? "disabled" : ""}><legend class="sr-only">Escolha uma resposta</legend>${question.choices.map((choice, index) => `<label class="answer-option ${feedback && index === question.answer ? "is-correct" : feedback && index === feedback.selected && !feedback.correct ? "is-wrong" : ""}"><input type="radio" name="answer" value="${index}" required ${feedback?.selected === index ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(choice)}</span>${feedback && index === question.answer ? icon("check") : ""}</label>`).join("")}</fieldset>${feedback ? `<div class="feedback ${feedback.correct ? "success" : "retry"}" role="status"><span class="lesson-feedback-mark" aria-hidden="true">${icon(feedback.correct ? "check" : "repeat")}</span><div><strong>${feedback.correct ? "Isso mesmo!" : "Vamos entender juntos."}</strong><p>${question.explanation}</p></div></div><div class="lesson-controls"><span class="small muted">${feedback.correct ? "Mais um passo dado." : "Você vai poder tentar esta pergunta de novo."}</span><button type="button" class="btn btn-primary" data-lesson="question-next" data-focus>Continuar ${icon("arrow")}</button></div>` : '<div class="lesson-controls align-end"><button class="btn btn-primary" type="submit">Verificar resposta</button></div>'}</form>`);
  }
  function done() {
    const next = stepAfter(ctx.progress, lesson.id);
    const nextModule = next && (next.kind === "lesson" ? getModule(next.lesson.moduleId) : next.unit);
    const scope = trainingScope(source);
    const nextStop = next ? `<a class="next-stop" href="#/${stepRoute(next)}"><span class="next-stop-copy"><span class="eyebrow">PRÓXIMA PARADA${nextModule.id !== lesson.moduleId ? " · " + moduleLabel(nextModule).toUpperCase() : ""}</span><strong>${next.kind === "lesson" ? next.lesson.title : "Checkpoint: " + esc(nextModule.title)}</strong><small>${next.kind === "lesson" ? esc(beginnerText(next.lesson.hook)) : "Mostre o que aprendeu e abra a próxima unidade."}</small></span><span class="next-stop-go">${icon("arrow")}</span></a>` : `<a class="next-stop" href="#/journey"><span class="next-stop-copy"><span class="eyebrow">${module.extra ? "FIM DO EXTRA" : "FIM DA TRILHA, POR ENQUANTO"}</span><strong>${module.extra ? "Você leu todas as lições deste extra." : "Você chegou ao fim das unidades prontas!"}</strong><small>Volte à trilha para revisar o que quiser.</small></span><span class="next-stop-go">${icon("arrow")}</span></a>`;
    shell(`<div class="completion"><div class="lesson-celebration">${lessonArt("celebrate")}<span class="completion-mark">${icon("check")}</span></div><p class="eyebrow">UM PASSO A MAIS</p><h2 data-focus tabindex="-1">Você aprendeu algo novo.</h2><p>${lesson.goal}</p><span class="pill sage">${awarded ? "+30 XP · Lição concluída" : "Lição revisitada · Conhecimento reforçado"}</span>${gameResult ? `<p class="lesson-game-result">${icon("target")} Jogo da lição: <strong>${gameResult.correct} de ${gameResult.total}</strong>${gameResult.correct === gameResult.total ? " · mesa limpa!" : ""}</p>` : ""}${nextStop}<div class="completion-actions">${lesson.practice ? `<button class="btn btn-ghost" data-lesson="practice">${lesson.practice.label} ${icon("arrow")}</button>` : ""}${scope ? `<button class="btn btn-ghost" data-lesson="renda">${icon("repeat")} Treinar no Só mais um</button>` : ""}${routeLink("journey/" + lesson.moduleId, "Voltar à trilha", "btn btn-ghost")}</div></div>`);
  }
  function draw() {
    if (step === 0) intro();
    else if (step <= SECTIONS) section(step - 1);
    else if (step === QUIZ) quiz();
    else if (step === GAME) {
      shell('<div id="lesson-game" class="lesson-game"></div>');
      unmountGame = mountLessonGame(ctx, ctx.main.querySelector("#lesson-game"), source, result => {
        unmountGame = null; gameResult = result;
        if (result) { personalBest(ctx.progress, lessonGameKey(lesson.id), result.correct); ctx.save(); }
        step = DONE; draw(); focus(); window.scrollTo({ top: 0, behavior: "instant" });
      });
    } else done();
  }
  function updateKanaDeck(deck) {
    const cards = [...deck.children];
    const index = cards.reduce((nearest, card, candidate) => Math.abs(card.offsetLeft - deck.scrollLeft) < Math.abs(cards[nearest].offsetLeft - deck.scrollLeft) ? candidate : nearest, 0);
    ctx.main.querySelectorAll("[data-kana-card]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.kanaCard) === index)));
    const position = ctx.main.querySelector(".kana-deck-position");
    if (position) position.textContent = `${index + 1} de ${cards.length}`;
  }
  ctx.main.addEventListener("scroll", event => {
    if (event.target.matches?.(".kana-tiles")) updateKanaDeck(event.target);
  }, { capture: true, signal: controller.signal });
  ctx.main.addEventListener("keydown", event => {
    const picker = event.target.closest(".kana-deck-picker");
    if (!picker || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = [...picker.querySelectorAll("[data-kana-card]")];
    const current = buttons.indexOf(event.target.closest("button"));
    const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : Math.max(0, Math.min(buttons.length - 1, current + (event.key === "ArrowRight" ? 1 : -1)));
    event.preventDefault(); buttons[index].focus(); buttons[index].click();
  }, { signal: controller.signal });
  ctx.main.addEventListener("submit", event => {
    if (event.target.id !== "lesson-answer") return;
    event.preventDefault();
    if (feedback) return;
    const selected = Number(new FormData(event.target).get("answer"));
    const correct = selected === lesson.quiz[queue[questionIndex]].answer;
    feedback = { selected, correct };
    ctx.audio.feedback(correct ? "correct" : "wrong");
    if (!correct) missed.push(queue[questionIndex]);
    draw();
    ctx.main.querySelector('[data-lesson="question-next"]')?.focus();
  }, { signal: controller.signal });
  ctx.main.addEventListener("click", event => {
    const reveal = event.target.closest("[data-reveal]");
    if (reveal) { reveal.outerHTML = `<strong>${esc(reveal.dataset.reveal)}</strong>`; return; }
    const card = event.target.closest("[data-kana-card]");
    if (card) {
      const deck = ctx.main.querySelector(".kana-tiles");
      const tile = deck?.children[Number(card.dataset.kanaCard)];
      if (tile) deck.scrollTo({ left: tile.offsetLeft, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      return;
    }
    const action = event.target.closest("[data-lesson]")?.dataset.lesson;
    if (!action) return;
    if (action === "next") step++;
    if (action === "back") step = Math.max(0, step - 1);
    if (action === "practice") { ctx.navigate(lesson.practice.route, lesson.practice); return; }
    if (action === "renda") { ctx.navigate("arcade/renda", { ...trainingScope(source), from: lesson.title }); return; }
    if (action === "question-next" && feedback) {
      questionIndex++;
      feedback = null;
      if (questionIndex === queue.length) {
        if (missed.length) { queue = missed; missed = []; questionIndex = 0; ctx.toast("Vamos reforçar as perguntas que precisam de mais uma tentativa."); }
        else { step++; awarded = completeLesson(ctx.progress, lesson.id, lesson.quiz.length); ctx.save(); ctx.audio.feedback("complete"); }
      }
    }
    draw();
    focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, { signal: controller.signal });
  bindVideos(ctx.main, controller.signal, () => ctx.audio.stop());
  draw();
  return () => { unmountGame?.(); controller.abort(); };
}
