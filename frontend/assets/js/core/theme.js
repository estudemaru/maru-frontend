// Keep the stored IDs so existing account preferences remain compatible.
export const THEMES = [
  { id: "dojo", title: "Sumi-e", subtitle: "Claro · caderno de tinta e papel.", description: "Papel amarelado, textura washi e vermelho de selo. Um caderno para voltar todos os dias.", symbol: "道", tag: "PAPEL & VERMELHO" },
  { id: "arcade", title: "Arcade", subtitle: "Escuro · pixels e neon.", description: "O mesmo caderno à noite: azul profundo, blocos de pixel e brilho de fliperama.", symbol: "遊", tag: "PIXEL & NEON" }
];
export function applyTheme(theme) {
  const selected = THEMES.some(item => item.id === theme) ? theme : "dojo";
  document.documentElement.dataset.theme = selected;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected === "arcade" ? "#080f22" : "#f3ead7");
  const mark = "maru-mark.svg";
  document.querySelector('link[rel="icon"]')?.setAttribute("href", "/assets/img/" + mark);
  document.querySelector(".brand img")?.setAttribute("src", "/assets/img/" + mark);
  document.querySelectorAll("[data-theme-choice]").forEach(button => {
    const active = button.dataset.themeChoice === selected;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-active", active);
  });
  const toggle = document.querySelector("#theme-toggle");
  if (toggle) {
    toggle.dataset.themeChoice = selected === "dojo" ? "arcade" : "dojo";
    toggle.setAttribute("aria-label", selected === "dojo" ? "Ativar modo escuro" : "Ativar modo claro");
    toggle.title = selected === "dojo" ? "Ativar modo escuro" : "Ativar modo claro";
    toggle.removeAttribute("aria-pressed");
    toggle.innerHTML = `<span aria-hidden="true">${selected === "dojo" ? "☾" : "☀"}</span>`;
  }
}
export function themeSwitcher() {
  return '<div class="theme-switcher" role="group" aria-label="Modo visual"><button class="theme-choice" data-theme-choice="dojo" aria-pressed="true"><span aria-hidden="true">道</span> Claro</button><button class="theme-choice" data-theme-choice="arcade" aria-pressed="false"><span aria-hidden="true">✦</span> Escuro</button></div>';
}

export function syncMotion() {
  let paused = document.documentElement.dataset.motion === "paused";
  try { paused = localStorage.getItem("maru-decoration-paused") === "true"; } catch {}
  document.documentElement.dataset.motion = paused ? "paused" : "running";
  document.querySelectorAll("[data-motion-toggle]").forEach(button => {
    button.setAttribute("aria-pressed", String(paused));
    button.textContent = paused ? "Retomar animações" : "Pausar animações";
  });
}

export function toggleMotion() {
  const paused = document.documentElement.dataset.motion !== "paused";
  document.documentElement.dataset.motion = paused ? "paused" : "running";
  try { localStorage.setItem("maru-decoration-paused", String(paused)); } catch {}
  syncMotion();
}
