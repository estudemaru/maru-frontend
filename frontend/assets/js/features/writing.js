import { KANA } from "/shared/content.js";
import { BEGINNER_KANJI } from "/shared/catalog.js";
import { recordActivity } from "/shared/progress.js";
import { pageHeading, icon, esc, audioButton, routeLink } from "../core/ui.js";

let strokeData;
async function getStrokes(signal) {
  if (!strokeData) {
    const response = await fetch("/assets/data/strokes.json", { signal });
    if (!response.ok) throw new Error("Não foi possível carregar os modelos.");
    strokeData = (await response.json()).characters;
  }
  return strokeData;
}

function mountCanvas(canvas, onInk, signal) {
  const context = canvas.getContext("2d");
  const strokes = [];
  let active = null;
  let pointerId = null;
  const point = event => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width * 109, (event.clientY - rect.top) / rect.height * 109];
  };
  const draw = () => {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.getBoundingClientRect().width;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(width * ratio);
    context.setTransform(canvas.width / 109, 0, 0, canvas.height / 109, 0, 0);
    context.lineWidth = 2.2;
    context.strokeStyle = "#302e2a";
    context.fillStyle = "#302e2a";
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const stroke of [...strokes, ...(active ? [active] : [])]) {
      if (stroke.length === 1) { context.beginPath(); context.arc(stroke[0][0], stroke[0][1], 1.1, 0, Math.PI * 2); context.fill(); }
      else { context.beginPath(); context.moveTo(...stroke[0]); stroke.slice(1).forEach(p => context.lineTo(...p)); context.stroke(); }
    }
  };
  const finish = event => {
    if (pointerId !== event.pointerId || !active) return;
    strokes.push(active); active = null; pointerId = null; onInk(strokes.length > 0); draw();
  };
  canvas.addEventListener("pointerdown", event => {
    if (pointerId !== null || event.button > 0) return;
    event.preventDefault();
    pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    active = [point(event)]; draw();
  }, { signal });
  canvas.addEventListener("pointermove", event => {
    if (!active || pointerId !== event.pointerId) return;
    active.push(point(event)); draw();
  }, { signal });
  canvas.addEventListener("pointerup", finish, { signal });
  canvas.addEventListener("pointercancel", finish, { signal });
  const resize = new ResizeObserver(draw);
  resize.observe(canvas);
  draw();
  return {
    clear() { strokes.length = 0; active = null; pointerId = null; onInk(false); draw(); },
    undo() { strokes.pop(); onInk(strokes.length > 0); draw(); },
    destroy() { resize.disconnect(); }
  };
}

export function renderWriting(ctx, char = "あ") {
  const controller = new AbortController();
  const { signal } = controller;
  let notebook;
  let animations = [];
  let playing = false;
  let step = 0;
  let paths = [];
  let registered = false;
  const selected = [...KANA, ...BEGINNER_KANJI].find(item => item.char === char) || KANA[0];
  char = selected.char;
  const initialGroup = selected.script || "kanji";
  function choices(group) {
    return (group === "kanji" ? BEGINNER_KANJI : KANA.filter(item => item.script === group))
      .map(item => `<option value="${item.char}" ${item.char === char ? "selected" : ""}>${item.char} · ${item.romaji}${item.meaning ? " · " + item.meaning : ""}</option>`).join("");
  }
  ctx.main.innerHTML = pageHeading("CADERNO DE ESCRITA", "Dê forma ao que aprendeu.", "Observe a ordem dos traços. Depois, experimente com o mouse, o dedo ou uma caneta.", routeLink("worksheets", "Imprimir atividades " + icon("pen"), "btn btn-ghost")) +
    `<div class="toolbar writing-toolbar"><div><label class="input-label" for="writing-group">O que vamos escrever?</label><select id="writing-group" class="text-input">${[["hiragana", "Hiragana"], ["katakana", "Katakana"], ["kanji", "Primeiros kanji"]].map(([id, label]) => `<option value="${id}" ${id === initialGroup ? "selected" : ""}>${label}</option>`).join("")}</select></div><div><label class="input-label" for="writing-char">Caractere</label><select id="writing-char" class="text-input">${choices(initialGroup)}</select></div><div class="writing-reading"><span class="jp" lang="ja">${char}</span><span><strong>${selected.romaji}</strong><small>${selected.meaning || (selected.romaji === "wo" ? "Partícula: som de o" : "Observe e repita")}</small></span>${audioButton(char)}</div></div>
    <div class="writing-grid"><section class="panel writing-panel"><div class="section-heading compact"><h2>1. Observe os traços</h2><span class="pill" id="stroke-count">Carregando…</span></div><div class="stroke-model" id="stroke-model"><span class="jp model-fallback" lang="ja">${char}</span></div><div class="stroke-controls"><button class="btn btn-primary" id="play-strokes" disabled>${icon("play")} Reproduzir</button><button class="icon-button" id="prev-stroke" aria-label="Traço anterior" disabled>${icon("back")}</button><button class="icon-button" id="next-stroke" aria-label="Próximo traço" disabled>${icon("arrow")}</button></div><p class="small muted" id="stroke-caption" aria-live="polite">Preparando o modelo de escrita.</p></section>
      <section class="panel writing-panel"><div class="section-heading compact"><h2>2. Agora é a sua vez</h2><span class="pill sage">Prática livre</span></div><div class="writing-stage"><div class="writing-guide" id="writing-guide" aria-hidden="true"></div><canvas id="writing-canvas" aria-label="Área para desenhar o caractere ${char} com mouse, toque ou caneta"></canvas></div><div class="drawing-controls"><button class="btn btn-ghost" id="toggle-guide" aria-pressed="true">${icon("eye")} Modelo</button><button class="icon-button" id="undo-stroke" aria-label="Desfazer último traço">${icon("undo")}</button><button class="btn btn-ghost" id="clear-writing">Limpar</button></div><button class="btn btn-primary full-width" id="save-writing" disabled>Registrar minha prática ${icon("check")}</button></section></div>
      <aside class="tip-box only-wide">${icon("pen")}<div><strong>Olhe para a direção, a proporção e os espaços.</strong><p>Compare seu desenho com o modelo. A prática é uma autoavaliação: o Maru não reconhece nem dá nota à sua caligrafia. Você também pode acompanhar os traços e escrever no papel.</p></div></aside>
      <p class="source-note">Modelos: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer">KanjiVG, Ulrich Apel e colaboradores</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>. Dados de traços extraídos dos SVG originais.</p>`;
  notebook = mountCanvas(ctx.main.querySelector("#writing-canvas"), hasInk => { ctx.main.querySelector("#save-writing").disabled = !hasInk || registered; }, signal);
  const updateModel = () => {
    paths.forEach((path, i) => { path.style.strokeDasharray = ""; path.style.strokeDashoffset = ""; path.classList.toggle("is-future", i >= step); });
    ctx.main.querySelector("#stroke-caption").textContent = step ? "Traço " + step + " de " + paths.length + ". A numeração indica o início de cada traço." : "Use Reproduzir ou avance um traço de cada vez.";
    ctx.main.querySelector("#prev-stroke").disabled = playing || step === 0;
    ctx.main.querySelector("#next-stroke").disabled = playing || step === paths.length;
  };
  const stop = () => { playing = false; animations.forEach(animation => animation.cancel()); animations = []; };
  getStrokes(signal).then(data => {
    if (signal.aborted) return;
    if (!data[char]) throw new Error("Modelo não disponível para este caractere.");
    const svg = `<svg viewBox="0 0 109 109" role="img" aria-label="Modelo de escrita de ${char}"><g class="stroke-paths">${data[char].map(d => `<path d="${esc(d)}"/>`).join("")}</g></svg>`;
    ctx.main.querySelector("#stroke-model").innerHTML = svg;
    ctx.main.querySelector("#writing-guide").innerHTML = svg;
    paths = [...ctx.main.querySelectorAll("#stroke-model path")];
    const svgElement = ctx.main.querySelector("#stroke-model svg");
    paths.forEach((path, i) => {
      const start = path.getPointAtLength(0);
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", Math.max(3, start.x - 5)); label.setAttribute("y", Math.max(7, start.y - 3));
      label.classList.add("stroke-number"); label.textContent = i + 1;
      svgElement.append(label);
    });
    ctx.main.querySelector("#stroke-count").textContent = paths.length + (paths.length === 1 ? " traço" : " traços");
    ctx.main.querySelector("#play-strokes").disabled = false;
    updateModel();
  }).catch(error => { if (!signal.aborted) ctx.main.querySelector("#stroke-caption").textContent = error.message + " Você ainda pode praticar livremente."; });
  ctx.main.addEventListener("change", event => {
    if (event.target.id === "writing-group") {
      const first = event.target.value === "kanji" ? BEGINNER_KANJI[0] : KANA.find(item => item.script === event.target.value);
      ctx.navigate("writing/" + encodeURIComponent(first.char));
    }
    if (event.target.id === "writing-char") ctx.navigate("writing/" + encodeURIComponent(event.target.value));
  }, { signal });
  ctx.main.addEventListener("click", async event => {
    const id = event.target.closest("button")?.id;
    if (id === "clear-writing") notebook.clear();
    if (id === "undo-stroke") notebook.undo();
    if (id === "toggle-guide") {
      const button = ctx.main.querySelector("#toggle-guide");
      const hidden = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!hidden));
      ctx.main.querySelector("#writing-guide").hidden = hidden;
    }
    if (id === "save-writing" && !registered && !ctx.main.querySelector("#save-writing").disabled) {
      registered = true; ctx.progress.stats.writingSessions++; ctx.audio.feedback("complete"); recordActivity(ctx.progress, 5); ctx.save();
      ctx.main.querySelector("#save-writing").disabled = true;
      ctx.main.querySelector("#save-writing").textContent = "Prática registrada · +5 XP";
      ctx.toast("Um traço de cada vez. Sua prática foi registrada.");
    }
    if (id === "prev-stroke" || id === "next-stroke") {
      stop(); step = Math.max(0, Math.min(paths.length, step + (id === "next-stroke" ? 1 : -1))); updateModel();
    }
    if (id === "play-strokes" && !playing) {
      playing = true; step = 0;
      ctx.main.querySelector("#play-strokes").disabled = true;
      updateModel();
      for (const path of paths) {
        if (signal.aborted || !playing) return;
        path.classList.remove("is-future");
        const length = path.getTotalLength();
        path.style.strokeDasharray = String(length);
        const animation = path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 750, fill: "forwards", easing: "ease-in-out" });
        animations.push(animation);
        try { await animation.finished; } catch { return; }
        step++; updateModel();
      }
      playing = false;
      ctx.main.querySelector("#play-strokes").disabled = false;
      updateModel();
    }
  }, { signal });
  return () => { controller.abort(); stop(); notebook?.destroy(); };
}
