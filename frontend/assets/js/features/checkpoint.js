import { getLesson, getModule, moduleLabel } from "/shared/curriculum.js";
import { CHECKPOINTS, PASS_RATIO, checkpointQuestions, gradeCheckpoint } from "/shared/checkpoints.js";
import { unitStates, nextStep, stepRoute, unlockHint } from "/shared/learningPath.js";
import { recordCheckpoint } from "/shared/progress.js";
import { esc, icon, routeLink, progressBar, emptyState, beginnerText } from "../core/ui.js";

// Uma aula ou um checkpoint de unidade fechada: o motivo e o caminho até ela.
export function lockedPanel(progress, module) {
  const step = nextStep(progress);
  return `<section class="panel trail-locked"><span class="trail-locked-mark" aria-hidden="true">${icon("lock")}</span><p class="eyebrow">${moduleLabel(module).toUpperCase()} · AINDA FECHADA</p><h1 tabindex="-1">${esc(module.title)}</h1><p>${esc(unlockHint(progress, module.id))} As unidades abrem uma por vez, porque cada uma usa o que a anterior ensinou.</p><div class="completion-actions">${routeLink(stepRoute(step), (step?.kind === "checkpoint" ? "Fazer o checkpoint" : "Continuar a trilha") + icon("arrow"), "btn btn-primary")}${routeLink("journey", "Ver a trilha", "btn btn-ghost")}</div><p class="small muted">Já sabe japonês? ${routeLink("placement", "Faça o diagnóstico", "text-link")} e comece mais adiante.</p></section>`;
}

// O checkpoint de uma unidade: perguntas uma por vez, com explicação na hora, e o
// resultado no fim. Toda tentativa fica registrada; errar não apaga nada.
export function renderCheckpoint(ctx, unitId) {
  const module = getModule(unitId), checkpoint = CHECKPOINTS[unitId];
  if (!module || !checkpoint) { ctx.main.innerHTML = emptyState("Checkpoint não encontrado", "Escolha uma unidade na sua trilha.", routeLink("journey", "Ver a trilha", "btn btn-primary")); return; }
  if (!unitStates(ctx.progress).find(unit => unit.id === unitId).open) { ctx.main.innerHTML = `<div class="checkpoint-page">${lockedPanel(ctx.progress, module)}</div>`; return; }
  const controller = new AbortController();
  const back = routeLink("journey/" + unitId, icon("back") + esc(module.title), "back-link");
  const concepts = Object.values(checkpoint.concepts);
  const topics = concepts.length > 1 ? concepts.slice(0, -1).join(", ") + " e " + concepts.at(-1) : concepts[0];
  let questions = [], answers = [], index = 0, feedback = null, result = null, firstPass = false;

  function intro() {
    const saved = ctx.progress.checkpoints[unitId];
    const status = saved?.passedAt ? `<span class="pill sage">${icon("check")} Aprovado · melhor nota ${saved.best}%</span>` : saved?.attempts ? `<span class="pill">Melhor nota até agora: ${saved.best}%</span>` : "";
    return `<div class="checkpoint-page">${back}<section class="panel checkpoint-intro"><p class="eyebrow">CHECKPOINT · ${moduleLabel(module).toUpperCase()}</p><h1 tabindex="-1">${esc(module.title)}</h1>${status}<p>Perguntas curtas sobre ${esc(topics)}. Com ${PASS_RATIO * 100}% de acerto, a próxima unidade abre.</p><ul class="plain-list"><li>Cada resposta vem com a explicação, na hora.</li><li>Errar não apaga nada, e dá para tentar de novo quando quiser.</li><li>Se você já sabe, pode fazer antes de terminar as aulas.</li></ul><div class="completion-actions"><button class="btn btn-primary" data-checkpoint="start">Começar o checkpoint ${icon("arrow")}</button>${routeLink("journey/" + unitId, "Voltar à unidade", "btn btn-ghost")}</div></section></div>`;
  }

  // O modo de leitura (kanji como kana) só vale para as provas de antes do katakana.
  const text = (value, item) => esc(item.plain ? value : beginnerText(value));

  function question() {
    const item = questions[index];
    const option = (choice, i) => `<label class="answer-option ${feedback && i === item.answer ? "is-correct" : feedback && i === feedback.selected && !feedback.correct ? "is-wrong" : ""}"><input type="radio" name="answer" value="${i}" required ${feedback?.selected === i ? "checked" : ""}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span>${text(choice, item)}</span>${feedback && i === item.answer ? icon("check") : ""}</label>`;
    const after = feedback
      ? `<div class="feedback ${feedback.correct ? "success" : "retry"}" role="status"><strong>${feedback.correct ? "Isso mesmo!" : "Não foi desta vez."}</strong><p>${text(item.explanation, item)}</p></div><div class="lesson-controls align-end"><button type="button" class="btn btn-primary" data-checkpoint="next">${index + 1 === questions.length ? "Ver o resultado" : "Continuar"} ${icon("arrow")}</button></div>`
      : '<div class="lesson-controls align-end"><button class="btn btn-primary" type="submit">Verificar resposta</button></div>';
    return `<div class="practice-session checkpoint-page">${back}<div class="session-heading"><h1 tabindex="-1">Checkpoint · ${esc(module.title)}</h1><span>${index + 1} / ${questions.length}</span></div>${progressBar(index / questions.length * 100, "Progresso do checkpoint")}<section class="panel quiz-stage"><h2 class="placement-question" data-focus tabindex="-1">${text(item.prompt, item)}</h2><form id="checkpoint-answer"><fieldset class="answer-options" ${feedback ? "disabled" : ""}><legend class="sr-only">Escolha uma resposta</legend>${item.choices.map(option).join("")}</fieldset>${after}</form></section></div>`;
  }

  function outcome() {
    const lessonOf = concept => getLesson(questions.find(item => item.concept === concept).lessonId);
    const review = concept => routeLink("lesson/" + lessonOf(concept).id, "Rever a aula “" + esc(lessonOf(concept).title) + "”", "text-link");
    const notes = [
      ...result.missedCritical.map(concept => `<p class="checkpoint-note is-critical">${icon("repeat")}<span>Quase lá: revise ${esc(checkpoint.concepts[concept])} antes de seguir. ${review(concept)}</span></p>`),
      ...result.missedConcepts.map(concept => `<p class="checkpoint-note">${icon("spark")}<span>${result.passed ? "Você passou, mas vale revisar" : "Vale revisar"} ${esc(checkpoint.concepts[concept])}. ${review(concept)}</span></p>`)
    ].join("");
    const need = Math.ceil(PASS_RATIO * questions.length - 1e-9);
    const step = nextStep(ctx.progress);
    const missed = questions.filter((item, i) => answers[i] !== item.answer);
    const heading = result.passed ? "Checkpoint aprovado!" : result.missedCritical.length && result.correct >= need ? "Quase lá." : "Ainda não foi desta vez.";
    const summary = result.passed ? "A próxima unidade está aberta." : result.correct >= need ? "A nota passou, mas um ponto essencial para a próxima unidade ficou de fora." : `Para passar, são ${need} de ${questions.length}.`;
    const actions = result.passed
      ? `${routeLink(stepRoute(step), "Seguir para a próxima parada" + icon("arrow"), "btn btn-primary")}<button class="btn btn-ghost" data-checkpoint="start">Fazer de novo</button>`
      : `<button class="btn btn-primary" data-checkpoint="start">Tentar de novo ${icon("repeat")}</button>${routeLink("journey/" + unitId, "Voltar à unidade", "btn btn-ghost")}`;
    return `<div class="checkpoint-page">${back}<section class="panel checkpoint-result ${result.passed ? "is-passed" : ""}"><p class="eyebrow">CHECKPOINT · ${moduleLabel(module).toUpperCase()}</p><h1 tabindex="-1">${heading}</h1><p class="checkpoint-score"><strong>${result.correct} de ${result.total}</strong> · ${result.percent}%</p><p>${summary}</p>${firstPass ? `<span class="pill sage">+50 XP · Checkpoint aprovado</span>` : ""}${notes}${missed.length ? `<details class="concept-help"><summary>Rever as perguntas que você errou</summary>${missed.map(item => `<article class="placement-review"><h3>${text(item.prompt, item)}</h3><p><strong>${text(item.choices[item.answer], item)}</strong> · ${text(item.explanation, item)}</p></article>`).join("")}</details>` : ""}<div class="completion-actions">${actions}</div></section></div>`;
  }

  const draw = () => { ctx.main.innerHTML = result ? outcome() : questions.length ? question() : intro(); };
  const focus = () => ctx.main.querySelector("[data-focus], h1")?.focus({ preventScroll: true });
  ctx.main.addEventListener("submit", event => {
    if (event.target.id !== "checkpoint-answer" || feedback) return;
    event.preventDefault();
    const selected = Number(new FormData(event.target).get("answer"));
    answers[index] = selected;
    feedback = { selected, correct: selected === questions[index].answer };
    ctx.audio.feedback(feedback.correct ? "correct" : "wrong");
    draw();
    ctx.main.querySelector('[data-checkpoint="next"]')?.focus();
  }, { signal: controller.signal });
  ctx.main.addEventListener("click", event => {
    const action = event.target.closest("[data-checkpoint]")?.dataset.checkpoint;
    if (action === "start") { questions = checkpointQuestions(unitId); answers = []; index = 0; feedback = null; result = null; firstPass = false; }
    else if (action === "next" && feedback) {
      feedback = null;
      if (++index === questions.length) {
        result = gradeCheckpoint(unitId, questions, answers);
        firstPass = recordCheckpoint(ctx.progress, unitId, result);
        ctx.save();
        ctx.audio.feedback(result.passed ? "complete" : "wrong");
      }
    } else return;
    draw(); focus(); window.scrollTo({ top: 0, behavior: "instant" });
  }, { signal: controller.signal });
  draw();
  return () => controller.abort();
}
