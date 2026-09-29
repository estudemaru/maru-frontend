import { CULTURE_CAPSULES } from "/shared/discovery.js";
import { conceptsIn } from "/shared/glossary.js";
import { getLesson, LESSONS } from "/shared/curriculum.js";
import { completeLesson } from "/shared/progress.js";
import { personalBest } from "/shared/arcade.js";
import { lessonGameKey } from "/shared/lessonGame.js";
import { mountLessonGame } from "./lessonGame.js";
import { esc, icon, routeLink, progressBar, exampleHTML, emptyState, beginnerText } from "../core/ui.js";

export function renderLesson(ctx, id) {
  const source = getLesson(id);
  const lesson = source && { ...source, goal:beginnerText(source.goal), sections:source.sections.map(section=>({...section,title:beginnerText(section.title),body:beginnerText(section.body),tip:section.tip && beginnerText(section.tip)})), quiz:source.quiz.map(question=>({...question,prompt:beginnerText(question.prompt),choices:question.choices.map(beginnerText),explanation:beginnerText(question.explanation)})) };
  if (!lesson) { ctx.main.innerHTML = emptyState("Lição não encontrada", "Escolha uma lição na sua trilha.", routeLink("journey", "Ver a trilha")); return; }
  let step = 0;
  let queue = lesson.quiz.map((_, i) => i);
  let questionIndex = 0;
  let missed = [];
  let feedback = null;
  let awarded = false;
  // Depois das perguntas vem o jogo da lição; a conclusão (e o XP) já fica registrada antes dele.
  let gameResult = null, unmountGame = null;
  const GAME = lesson.sections.length + 1, DONE = lesson.sections.length + 2;
  const controller = new AbortController();
  const focus = () => ctx.main.querySelector("[data-focus]")?.focus({ preventScroll: true });
  const shell = content => {
    ctx.main.innerHTML = `<div class="lesson-reader">${routeLink("journey/" + lesson.moduleId, icon("back") + lesson.moduleTitle, "back-link")}<div class="lesson-reader-head"><div><p class="eyebrow">LIÇÃO ${String(lesson.index + 1).padStart(2, "0")}</p><h1 tabindex="-1">${lesson.title}</h1></div><span class="pill">${icon("clock")} ${lesson.minutes} min</span></div>${progressBar(step >= DONE ? 100 : (step + (step === lesson.sections.length ? questionIndex / queue.length : 0)) / DONE * 100, "Progresso da lição")}<div class="lesson-content panel">${content}</div></div>`;
  };
  function draw() {
    if (step < lesson.sections.length) {
      const section = lesson.sections[step];
      const capsule = step === lesson.sections.length - 1 ? CULTURE_CAPSULES.find(item => item.lessonId === id) : null;
      const concepts = conceptsIn(section.body + " " + section.title);
      const help = concepts.length ? `<details class="concept-help"><summary>Em outras palavras · termos desta explicação</summary><dl>${concepts.map(item => `<dt>${item.term}</dt><dd>${esc(beginnerText(item.definition))}<small>${esc(beginnerText(item.example))}</small></dd>`).join("")}</dl></details>` : "";
      shell(`<span class="step-label">ENTENDA · ${step + 1} DE ${lesson.sections.length}</span><h2 data-focus tabindex="-1">${section.title}</h2><p class="lesson-body">${section.body}</p><div class="examples-grid">${section.examples.map(example => exampleHTML(example, ctx.progress.preferences.romaji)).join("")}</div>${section.tip ? `<aside class="tip-box">${icon("spark")}<p>${section.tip}</p></aside>` : ""}${help}${capsule ? `<aside class="culture-capsule"><p class="eyebrow">JAPONÊS EM CONTEXTO</p><h3>${capsule.title}</h3>${exampleHTML(capsule.expression, ctx.progress.preferences.romaji)}<p>${esc(beginnerText(capsule.expression.context))}</p>${routeLink("expressions", "Conhecer mais expressões " + icon("arrow"), "text-link")}</aside>` : ""}<div class="lesson-controls"><button class="btn btn-ghost" data-lesson="back" ${step ? "" : "disabled"}>${icon("back")} Voltar</button><span class="small muted">Leia, ouça e experimente.</span><button class="btn btn-primary" data-lesson="next">${step + 1 === lesson.sections.length ? "Praticar o que aprendi" : "Continuar"} ${icon("arrow")}</button></div>`);
    } else if (step === lesson.sections.length) {
      const question = lesson.quiz[queue[questionIndex]];
      shell(`<span class="step-label">SUA VEZ · ${questionIndex + 1} DE ${queue.length}</span><h2 data-focus tabindex="-1">${esc(question.prompt)}</h2><p class="muted">Escolha uma resposta. Errar faz parte do aprendizado.</p><form id="lesson-answer"><fieldset class="answer-options" ${feedback ? "disabled" : ""}><legend class="sr-only">Escolha uma resposta</legend>${question.choices.map((choice, index) => `<label class="answer-option ${feedback && index === question.answer ? "is-correct" : feedback && index === feedback.selected && !feedback.correct ? "is-wrong" : ""}"><input type="radio" name="answer" value="${index}" required ${feedback?.selected === index ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(choice)}</span>${feedback && index === question.answer ? icon("check") : ""}</label>`).join("")}</fieldset>${feedback ? `<div class="feedback ${feedback.correct ? "success" : "retry"}" role="status"><strong>${feedback.correct ? "Isso mesmo!" : "Vamos entender juntos."}</strong><p>${question.explanation}</p></div><div class="lesson-controls"><span class="small muted">${feedback.correct ? "Mais um passo dado." : "Você poderá tentar esta pergunta novamente."}</span><button type="button" class="btn btn-primary" data-lesson="question-next" data-focus>Continuar ${icon("arrow")}</button></div>` : '<div class="lesson-controls align-end"><button class="btn btn-primary" type="submit">Verificar resposta</button></div>'}</form>`);
    } else if (step === GAME) {
      shell('<div id="lesson-game" class="lesson-game"></div>');
      unmountGame = mountLessonGame(ctx, ctx.main.querySelector("#lesson-game"), source, result => {
        unmountGame = null; gameResult = result;
        if (result) { personalBest(ctx.progress, lessonGameKey(lesson.id), result.correct); ctx.save(); }
        step = DONE; draw(); focus(); window.scrollTo({ top: 0, behavior: "instant" });
      });
    } else {
      const next = LESSONS[LESSONS.findIndex(item => item.id === lesson.id) + 1];
      shell(`<div class="completion"><span class="completion-mark">${icon("check")}</span><p class="eyebrow">UM PASSO A MAIS</p><h2 data-focus tabindex="-1">Você aprendeu algo novo.</h2><p>${lesson.goal}</p><span class="pill sage">${awarded ? "+30 XP · Lição concluída" : "Lição revisitada · Conhecimento reforçado"}</span>${gameResult ? `<p class="lesson-game-result">${icon("target")} Jogo da lição: <strong>${gameResult.correct} de ${gameResult.total}</strong>${gameResult.correct === gameResult.total ? " · mesa limpa!" : ""}</p>` : ""}<div class="completion-actions">${lesson.practice ? `<button class="btn btn-primary" data-lesson="practice">${lesson.practice.label} ${icon("arrow")}</button>` : next ? routeLink("lesson/" + next.id, "Próxima lição " + icon("arrow"), "btn btn-primary") : routeLink("review", "Revisar o que aprendi", "btn btn-primary")}${routeLink("journey/" + lesson.moduleId, "Voltar à trilha", "btn btn-ghost")}</div>${lesson.practice && next ? routeLink("lesson/" + next.id, "Ir para a próxima lição " + icon("arrow"), "text-link") : ""}</div>`);
    }
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
    const action = event.target.closest("[data-lesson]")?.dataset.lesson;
    if (!action) return;
    if (action === "next") step++;
    if (action === "back") step = Math.max(0, step - 1);
    if (action === "practice") { ctx.navigate(lesson.practice.route, lesson.practice); return; }
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
  draw();
  return () => { unmountGame?.(); controller.abort(); };
}
