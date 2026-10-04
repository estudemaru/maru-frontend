import { CULTURE_CAPSULES } from "/shared/discovery.js";
import { conceptsIn } from "/shared/glossary.js";
import { getLesson, getModule, LESSONS } from "/shared/curriculum.js";
import { completeLesson } from "/shared/progress.js";
import { personalBest } from "/shared/arcade.js";
import { lessonGameKey, lessonGameKind, LESSON_GAME_KINDS } from "/shared/lessonGame.js";
import { videosFor } from "/shared/videos.js";
import { mountLessonGame } from "./lessonGame.js";
import { hasKanaFoundation } from "../core/beginner.js";
import { videoPanelHTML, bindVideos } from "../core/videos.js";
import { esc, icon, routeLink, progressBar, exampleHTML, emptyState, beginnerText, richText } from "../core/ui.js";

// Um caractere de kana com dica de memória vira um cartão grande, que toca o som ao ser tocado.
const isKanaTile = example => example.note && /^[ぁ-ゖァ-ヺ]{1,2}$/u.test(example.jp);
function kanaTile(example, romaji) {
  const sound = romaji ? `<strong>${esc(example.romaji)}</strong>` : `<button type="button" class="kana-tile-reveal" data-reveal="${esc(example.romaji)}">Mostrar o som</button>`;
  const detail = example.pt && example.pt !== example.romaji ? `<span>${esc(example.pt)}</span>` : "";
  return `<article class="kana-tile"><button type="button" class="kana-tile-char" data-speak="${esc(example.jp)}" aria-label="Ouvir ${esc(example.jp)}"><span class="jp" lang="ja">${esc(example.jp)}</span><span class="kana-tile-speaker">${icon("volume")}</span></button><div class="kana-tile-body"><p class="kana-tile-sound">${sound}${detail}</p><p class="kana-tile-hint"><span>Dica de memória</span>${esc(beginnerText(example.note))}</p>${example.jp.length === 1 ? `<a class="kana-tile-write" href="#/writing/${encodeURIComponent(example.jp)}">${icon("pen")} Ver os traços</a>` : ""}</div></article>`;
}
const examplesHTML = (examples, romaji) => !examples.length ? "" : examples.every(isKanaTile)
  ? `<div class="kana-tiles">${examples.map(example => kanaTile(example, romaji)).join("")}</div>`
  : `<div class="examples-grid${examples.length > 1 && examples.every(example => example.jp.length <= 6 && !example.note && !example.image) ? " is-compact" : ""}">${examples.map(example => exampleHTML(example, romaji)).join("")}</div>`;

// Letras que a trilha já apresentou até esta lição, para o treino "Só mais um".
function trainingScope(lesson) {
  const module = getModule(lesson.moduleId);
  if (module.id === "kanji") return { script: "kanji" };
  if (!["hiragana", "katakana"].includes(module.id)) return null;
  const seen = module.lessons.slice(0, module.lessons.findIndex(item => item.id === lesson.id) + 1);
  const rows = [...new Set(seen.flatMap(item => item.practice?.rows || []))];
  const groups = [...new Set(seen.flatMap(item => item.practice?.group ? [item.practice.group] : []))];
  return rows.length ? { script: module.id, rows, groups } : { script: module.id };
}

export function renderLesson(ctx, id) {
  const source = getLesson(id);
  if (!source) { ctx.main.innerHTML = emptyState("Lição não encontrada", "Escolha uma lição na sua trilha.", routeLink("journey", "Ver a trilha")); return; }
  const lesson = { ...source, goal: beginnerText(source.goal), hook: beginnerText(source.hook), sections: source.sections.map(section => ({ ...section, title: beginnerText(section.title), body: section.body.split("\n").map(beginnerText).join("\n"), tip: section.tip && beginnerText(section.tip) })), quiz: source.quiz.map(question => ({ ...question, prompt: beginnerText(question.prompt), choices: question.choices.map(beginnerText), explanation: beginnerText(question.explanation) })) };
  const module = getModule(lesson.moduleId);
  const videos = videosFor(id);
  const kanaReady = hasKanaFoundation(ctx.progress);
  const firstTile = lesson.sections.flatMap(section => section.examples).find(isKanaTile);
  const mark = firstTile?.jp || (kanaReady || !/\p{Script=Han}/u.test(module.symbol) ? module.symbol : module.number);
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
  const position = `ETAPA ${module.number} · LIÇÃO ${String(lesson.index + 1).padStart(2, "0")} DE ${String(module.lessons.length).padStart(2, "0")}`;
  const shell = content => {
    const progress = step >= DONE ? 100 : (step + (step === QUIZ ? questionIndex / queue.length : 0)) / DONE * 100;
    const phase = step === 0 ? "intro" : step <= SECTIONS ? "reading" : step === QUIZ ? "quiz" : step === GAME ? "game" : "done";
    ctx.main.innerHTML = `<div class="lesson-reader" data-lesson-phase="${phase}">${routeLink("journey/" + lesson.moduleId, icon("back") + lesson.moduleTitle, "back-link")}<div class="lesson-reader-head"><div><p class="eyebrow">${position}</p><h1 tabindex="-1">${lesson.title}</h1></div><span class="pill">${icon("clock")} ${lesson.minutes} min</span></div>${progressBar(progress, "Progresso da lição")}<div class="lesson-content panel">${content}</div></div>`;
  };
  const recapHTML = () => source.recap.length ? `<aside class="lesson-recap"><p class="eyebrow">RESUMINDO</p><ul>${source.recap.map(item => `<li>${esc(beginnerText(item))}</li>`).join("")}</ul></aside>` : "";
  function intro() {
    const game = LESSON_GAME_KINDS[lessonGameKind(source)];
    shell(`<div class="lesson-intro"><div class="lesson-intro-top"><span class="lesson-intro-mark jp" lang="ja" aria-hidden="true">${mark}</span><div><span class="step-label">ANTES DE COMEÇAR</span><h2 data-focus tabindex="-1">${esc(lesson.hook)}</h2></div></div>
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
    const help = concepts.length ? `<details class="concept-help"><summary>Em outras palavras · termos desta explicação</summary><dl>${concepts.map(item => `<dt>${item.term}</dt><dd>${esc(beginnerText(item.definition))}<small>${esc(beginnerText(item.example))}</small></dd>`).join("")}</dl></details>` : "";
    shell(`<span class="step-label">PARTE ${index + 1} DE ${SECTIONS}</span><h2 data-focus tabindex="-1">${part.title}</h2><div class="lesson-body">${richText(part.body)}</div>${examplesHTML(part.examples, ctx.progress.preferences.romaji)}${part.tip ? `<aside class="maru-tip"><img src="/assets/img/maru-mark.svg" alt="" width="34" height="34"><div><strong>Dica do Maru</strong><p>${part.tip}</p></div></aside>` : ""}${help}${capsule ? `<aside class="culture-capsule"><p class="eyebrow">JAPONÊS EM CONTEXTO</p><h3>${capsule.title}</h3>${exampleHTML(capsule.expression, ctx.progress.preferences.romaji)}<p>${esc(beginnerText(capsule.expression.context))}</p>${routeLink("expressions", "Conhecer mais expressões " + icon("arrow"), "text-link")}</aside>` : ""}${last ? recapHTML() : ""}<div class="lesson-controls"><button class="btn btn-ghost" data-lesson="back">${icon("back")} Voltar</button><span class="small muted">${last ? "Agora é com você." : "Leia, ouça e experimente."}</span><button class="btn btn-primary" data-lesson="next">${last ? "Praticar o que aprendi" : "Continuar"} ${icon("arrow")}</button></div>`);
  }
  function quiz() {
    const question = lesson.quiz[queue[questionIndex]];
    shell(`<span class="step-label">SUA VEZ · ${questionIndex + 1} DE ${queue.length}</span><h2 data-focus tabindex="-1">${esc(question.prompt)}</h2><p class="muted">Escolha uma resposta. Errar faz parte do aprendizado.</p><form id="lesson-answer"><fieldset class="answer-options" ${feedback ? "disabled" : ""}><legend class="sr-only">Escolha uma resposta</legend>${question.choices.map((choice, index) => `<label class="answer-option ${feedback && index === question.answer ? "is-correct" : feedback && index === feedback.selected && !feedback.correct ? "is-wrong" : ""}"><input type="radio" name="answer" value="${index}" required ${feedback?.selected === index ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(choice)}</span>${feedback && index === question.answer ? icon("check") : ""}</label>`).join("")}</fieldset>${feedback ? `<div class="feedback ${feedback.correct ? "success" : "retry"}" role="status"><strong>${feedback.correct ? "Isso mesmo!" : "Vamos entender juntos."}</strong><p>${question.explanation}</p></div><div class="lesson-controls"><span class="small muted">${feedback.correct ? "Mais um passo dado." : "Você vai poder tentar esta pergunta de novo."}</span><button type="button" class="btn btn-primary" data-lesson="question-next" data-focus>Continuar ${icon("arrow")}</button></div>` : '<div class="lesson-controls align-end"><button class="btn btn-primary" type="submit">Verificar resposta</button></div>'}</form>`);
  }
  function done() {
    const next = LESSONS[LESSONS.findIndex(item => item.id === lesson.id) + 1];
    const scope = trainingScope(source);
    const nextStop = next ? `<a class="next-stop" href="#/lesson/${next.id}"><span class="next-stop-copy"><span class="eyebrow">PRÓXIMA PARADA${next.moduleId !== lesson.moduleId ? " · NOVA ETAPA" : ""}</span><strong>${next.title}</strong><small>${esc(beginnerText(next.hook))}</small></span><span class="next-stop-go">${icon("arrow")}</span></a>` : `<a class="next-stop" href="#/journey"><span class="next-stop-copy"><span class="eyebrow">FIM DA TRILHA</span><strong>Você chegou ao fim das 8 etapas!</strong><small>Volte à trilha para revisar o que quiser.</small></span><span class="next-stop-go">${icon("arrow")}</span></a>`;
    shell(`<div class="completion"><span class="completion-mark">${icon("check")}</span><p class="eyebrow">UM PASSO A MAIS</p><h2 data-focus tabindex="-1">Você aprendeu algo novo.</h2><p>${lesson.goal}</p><span class="pill sage">${awarded ? "+30 XP · Lição concluída" : "Lição revisitada · Conhecimento reforçado"}</span>${gameResult ? `<p class="lesson-game-result">${icon("target")} Jogo da lição: <strong>${gameResult.correct} de ${gameResult.total}</strong>${gameResult.correct === gameResult.total ? " · mesa limpa!" : ""}</p>` : ""}${nextStop}<div class="completion-actions">${lesson.practice ? `<button class="btn btn-ghost" data-lesson="practice">${lesson.practice.label} ${icon("arrow")}</button>` : ""}${scope ? `<button class="btn btn-ghost" data-lesson="renda">${icon("repeat")} Treinar no Só mais um</button>` : ""}${routeLink("journey/" + lesson.moduleId, "Voltar à trilha", "btn btn-ghost")}</div></div>`);
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
