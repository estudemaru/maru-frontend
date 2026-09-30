// Digitar japonês sem teclado japonês: o romaji vira kana enquanto se digita (wanakana).
// Campos com data-kana recebem a conversão; quem já usa um teclado japonês não é afetado,
// porque kana digitado passa direto. A biblioteca só é baixada quando um desses campos aparece.
let request = null, wanakana = null, mode = "hiragana", enabled = () => true;
const bound = new Set();
const load = () => request ||= import("/assets/vendor/wanakana.js").then(module => (wanakana = module)).catch(error => { request = null; throw error; });
// あ: minúsculas viram hiragana e MAIÚSCULAS viram katakana. ア: tudo vira katakana.
const options = () => ({ IMEMode: mode === "katakana" ? "toKatakana" : true });
const labels = { hiragana: ["あ", "Romaji vira hiragana. Toque para katakana."], katakana: ["ア", "Romaji vira katakana. Toque para hiragana."] };

async function bindInput(input) {
  if (bound.has(input) || !enabled()) return;
  bound.add(input);
  try { await load(); if (bound.has(input)) wanakana.bind(input, options()); }
  catch { bound.delete(input); }
}
function unbindInput(input) {
  if (!bound.delete(input) || !wanakana) return;
  try { wanakana.unbind(input); } catch { /* o campo nunca chegou a ser ligado */ }
}
function syncToggles() {
  const [symbol, label] = labels[mode];
  // Só escreve o que mudou: cada escrita no DOM dispararia o observador de novo.
  document.querySelectorAll("[data-kana-mode]").forEach(button => {
    if (button.hidden !== !enabled()) button.hidden = !enabled();
    if (button.textContent !== symbol) button.textContent = symbol;
    if (button.getAttribute("aria-label") !== label) { button.setAttribute("aria-label", label); button.title = label; }
  });
}

export const kanaModeButton = () => `<button class="kana-mode" type="button" data-kana-mode aria-label="${labels[mode][1]}" title="${labels[mode][1]}">${labels[mode][0]}</button>`;

// O "n" final de "pan" só vira ん quando a palavra termina: converte o resto antes da correção.
export function finishKana(input) {
  if (!wanakana || !bound.has(input)) return;
  const text = mode === "katakana" ? wanakana.toKatakana(input.value) : wanakana.toKana(input.value);
  if (text !== input.value) input.value = text;
}

export function setupKanaInput(root, isEnabled) {
  enabled = isEnabled;
  const scan = () => {
    for (const input of [...bound]) if (!input.isConnected || !enabled()) unbindInput(input);
    if (enabled()) root.querySelectorAll("input[data-kana]").forEach(bindInput);
    syncToggles();
  };
  new MutationObserver(scan).observe(root, { childList: true, subtree: true });
  // Fase de captura: roda antes de a tela ler a resposta no seu próprio submit.
  document.addEventListener("submit", event => event.target.querySelectorAll?.("input[data-kana]").forEach(finishKana), true);
  document.addEventListener("click", event => {
    const toggle = event.target.closest("[data-kana-mode]");
    if (!toggle) return;
    mode = mode === "hiragana" ? "katakana" : "hiragana";
    for (const input of [...bound]) { unbindInput(input); bindInput(input); }
    syncToggles();
    toggle.closest("form")?.querySelector("input[data-kana]")?.focus();
  });
  scan();
  return { rescan: scan };
}
