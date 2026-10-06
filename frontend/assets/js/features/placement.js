import { PLACEMENT_QUESTIONS, placementResult } from "/shared/placement.js";
import { UNITS, moduleLabel } from "/shared/curriculum.js";
import { esc, icon, pageHeading, routeLink, progressBar } from "../core/ui.js";

export function renderPlacement(ctx) {
  const controller = new AbortController();
  let started = Object.keys(ctx.progress.placement.answers).length > 0;
  let feedback = null;
  const persist = () => { ctx.progress.placement.updatedAt = Date.now(); ctx.save(); };
  function draw() {
    const p = ctx.progress.placement;
    const result = placementResult(p.answers);
    if (result.complete) {
      const module = UNITS.find(item => item.id === result.moduleId);
      // Dá para começar antes da sugestão, nunca depois: mais adiante, os checkpoints abrem o caminho.
      const choices = UNITS.slice(0, UNITS.indexOf(module) + 1).filter(item => item.lessons.length);
      ctx.main.innerHTML = pageHeading("UM PONTO DE PARTIDA, NÃO UMA NOTA", "Seu caminho pode começar aqui.", "Esta rodada é uma orientação inicial dentro do Maru. Você pode voltar ao básico a qualquer momento.") +
        `<section class="panel placement-result"><span class="module-symbol ${module.color} jp">${module.symbol}</span><p class="eyebrow">${moduleLabel(module).toUpperCase()} · SUGERIDA PARA VOCÊ</p><h2>${module.title}</h2><p>${module.subtitle}</p><p class="muted">O reconhecimento de kana vem primeiro. Depois observamos palavras, partículas e leitura. As unidades antes dela ficam abertas, como se você tivesse passado nos checkpoints. Nenhuma lição foi concluída automaticamente e nenhum XP foi dado.</p><button class="btn btn-primary" data-placement="accept" data-module="${module.id}">Começar pela unidade sugerida ${icon("arrow")}</button><div class="placement-adjust"><label class="input-label" for="placement-module">Prefere começar antes?</label><select class="text-input" id="placement-module">${choices.map(item => `<option value="${item.id}" ${item.id === module.id ? "selected" : ""}>${moduleLabel(item)} · ${item.title}</option>`).join("")}</select><button class="btn btn-ghost" data-placement="adjust">Usar esta unidade</button></div></section><section class="panel placement-breakdown"><h2>O que apareceu nesta rodada</h2><div class="placement-areas">${result.areas.map(area => `<div><strong>${area.label}</strong><span>${area.correct} de ${area.total} reconhecidos</span></div>`).join("")}</div><p class="small muted">Uma amostra pequena ajuda a escolher por onde começar; não mede fluência nem corresponde a um nível oficial do JLPT.</p><details class="concept-help"><summary>Rever as respostas e as explicações</summary>${PLACEMENT_QUESTIONS.map(item => `<article class="placement-review"><h3>${esc(item.prompt)}</h3><p>Sua resposta: ${p.answers[item.id] === null ? "Ainda não sei" : esc(item.choices[p.answers[item.id]])}</p><p><strong>${esc(item.choices[item.answer])}</strong> · ${esc(item.explanation)}</p></article>`).join("")}</details><button class="btn btn-ghost" data-placement="restart">Refazer diagnóstico</button>${routeLink("journey", "Ver toda a trilha", "text-link")}</section>`;
      return;
    }
    if (!started) {
      ctx.main.innerHTML = pageHeading("JÁ SABE UM POUCO?", "Encontre a sua porta de entrada.", "Quinze perguntas, cerca de quatro minutos. Sem cronômetro e sem precisar acertar tudo.") +
        `<section class="panel placement-intro"><span class="hanko jp" lang="ja" aria-hidden="true">道</span><h2>Comece pelo que faz sentido para você.</h2><p>Vamos reconhecer alguns kana, olhar palavras, completar partículas e ler duas frases curtas. Se não souber, escolha “Ainda não sei”. Isso também ajuda a encontrar um começo confortável.</p><ul class="plain-list only-wide"><li>Você pode sair e continuar depois.</li><li>A sugestão não conclui lições nem altera XP ou constância.</li><li>O resultado abre as unidades até o seu ponto de partida.</li></ul><div class="completion-actions"><button class="btn btn-primary" data-placement="start">Encontrar meu começo ${icon("arrow")}</button>${routeLink("lesson/welcome", "Prefiro começar do zero", "btn btn-ghost")}</div></section>`;
      return;
    }
    const index = feedback ? feedback.index : PLACEMENT_QUESTIONS.findIndex(item => !Object.hasOwn(p.answers, item.id));
    const question = PLACEMENT_QUESTIONS[index];
    ctx.main.innerHTML = `<div class="practice-session placement-session">${routeLink("home", icon("back") + "Continuar depois", "back-link")}<div class="session-heading"><h1 tabindex="-1">Encontre seu começo.</h1><span>${index + 1} / ${PLACEMENT_QUESTIONS.length}</span></div>${progressBar(index / PLACEMENT_QUESTIONS.length * 100, "Progresso do diagnóstico")}<section class="panel quiz-stage">${question.passage ? `<p class="placement-passage" lang="ja">${esc(question.passage)}</p>` : ""}<h2 class="placement-question">${esc(question.prompt)}</h2><form id="placement-answer"><fieldset class="answer-options" ${feedback ? "disabled" : ""}><legend class="sr-only">Escolha a resposta</legend>${question.choices.map((choice, i) => `<label class="answer-option"><input type="radio" name="answer" value="${i}" required ${feedback?.selected === i ? "checked" : ""}><span class="option-letter">${i + 1}</span><span>${esc(choice)}</span></label>`).join("")}</fieldset>${feedback ? `<div class="feedback" role="status"><strong>Resposta registrada.</strong><p>As explicações ficam disponíveis ao final, junto com a sugestão.</p></div><button type="button" class="btn btn-primary" data-placement="next">Continuar ${icon("arrow")}</button>` : '<div class="completion-actions"><button class="btn btn-primary" type="submit">Registrar resposta</button><button class="btn btn-ghost" type="button" data-placement="skip">Ainda não sei</button></div>'}</form><p class="source-note">Sua rodada fica salva neste navegador. Errar aqui não entra na revisão nem muda sua constância.</p></section></div>`;
  }
  function answer(selected) {
    const index = PLACEMENT_QUESTIONS.findIndex(item => !Object.hasOwn(ctx.progress.placement.answers, item.id));
    if (index < 0 || feedback) return;
    ctx.progress.placement.answers[PLACEMENT_QUESTIONS[index].id] = selected;
    feedback = { selected, index };
    persist();
    // Keep the last question's feedback before showing the result.
    if (placementResult(ctx.progress.placement.answers).complete) {
      ctx.progress.placement.completedAt = Date.now(); persist(); feedback = null;
    }
    draw(); ctx.main.querySelector('[data-placement="next"]')?.focus();
  }
  ctx.main.addEventListener("submit", event => {
    if (event.target.id !== "placement-answer") return;
    event.preventDefault();
    const value = new FormData(event.target).get("answer");
    if (value !== null) answer(Number(value));
  }, { signal: controller.signal });
  ctx.main.addEventListener("click", event => {
    const button = event.target.closest("[data-placement]"), action = button?.dataset.placement;
    if (action === "start") { started = true; draw(); }
    if (action === "skip") answer(null);
    if (action === "next") { feedback = null; draw(); }
    if (action === "restart") { ctx.progress.placement.answers = {}; ctx.progress.placement.completedAt = 0; feedback = null; started = true; persist(); draw(); }
    if (action === "accept" || action === "adjust") {
      const id = action === "accept" ? button.dataset.module : ctx.main.querySelector("#placement-module").value;
      const suggested = UNITS.findIndex(unit => unit.id === placementResult(ctx.progress.placement.answers).moduleId);
      if (!UNITS.some((unit, index) => unit.id === id && index <= suggested)) return;
      ctx.progress.placement.acceptedModule = id; persist(); ctx.navigate("journey/" + id);
    }
  }, { signal: controller.signal });
  draw();
  return () => controller.abort();
}
