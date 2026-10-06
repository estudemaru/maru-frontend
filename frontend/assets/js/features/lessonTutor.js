import { getAiStatus, askLessonTutor } from "../api.js";
import { esc } from "../core/ui.js";

export function mountLessonTutor(ctx, host, lessonId, signal) {
  if (!host) return;
  let enabled = false, pending = false, question = "", answer = "", error = "";
  // Sem IA, a caixa nem aparece.
  host.hidden = true;
  const draw = () => {
    if (signal.aborted || !host.isConnected) return;
    host.hidden = !enabled;
    host.innerHTML = enabled ? `<details class="concept-help"><summary>Tirar uma dúvida com o Maru · IA</summary>
      <p class="small muted">Pergunte sobre esta lição. Requer login. Sua pergunta será enviada à OpenAI; a IA pode errar.</p>
      <form data-tutor-form><label class="input-label" for="tutor-question">Sua dúvida</label>
      <textarea class="text-input" id="tutor-question" name="question" maxlength="1000" required ${pending ? "disabled" : ""}>${esc(question)}</textarea>
      <button class="btn btn-ghost" ${pending ? "disabled" : ""}>${pending ? "Pensando…" : "Perguntar"}</button></form>
      <div role="status" style="white-space:pre-wrap">${esc(answer)}</div>${error ? `<p role="alert">${esc(error)}</p>` : ""}</details>` : "";
  };
  host.addEventListener("submit", async event => {
    if (!event.target.matches("[data-tutor-form]")) return;
    event.preventDefault();
    if (pending) return;
    question = String(new FormData(event.target).get("question") || "").trim();
    if (!question) return;
    pending = true; answer = ""; error = ""; draw();
    host.querySelector("details").open = true;
    try { answer = (await askLessonTutor({ lessonId, question }, signal)).answer; }
    catch (failure) { error = failure.message; }
    pending = false; draw();
    if (!signal.aborted && host.isConnected) host.querySelector("details").open = true;
  }, { signal });
  getAiStatus().then(status => { enabled = status.enabled; draw(); }).catch(() => {});
}
