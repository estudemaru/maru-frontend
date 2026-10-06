import { PRACTICE_TOOLS, RESOURCES, RESOURCE_GROUPS } from "../core/navigation.js";
import { pageHeading, icon, routeLink, esc } from "../core/ui.js";
import { nextStep, stepRoute } from "/shared/learningPath.js";
import { dueReviews } from "/shared/progress.js";

const symbol = item => ["あ", "日"].includes(item.icon) ? `<span class="jp" lang="ja">${item.icon}</span>` : icon(item.icon);
const card = (item, heading = "h3") => `<a class="hub-card panel" href="#/${item.route}" aria-labelledby="resource-${item.route}" aria-describedby="description-${item.route}"><span class="hub-card-symbol ${item.color}" aria-hidden="true">${symbol(item)}</span><${heading} id="resource-${item.route}">${item.title}</${heading}><p id="description-${item.route}">${item.description}</p><span class="hub-card-action" aria-hidden="true">${item.detail || "Explorar"}${icon("arrow")}</span></a>`;
const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function renderPracticeHub(ctx) {
  const due = dueReviews(ctx.progress).length;
  const next = nextStep(ctx.progress);
  ctx.main.innerHTML = pageHeading("UM POUCO, TODOS OS DIAS", "Escolha seu jogo de hoje.", "Escolha como quer praticar agora. Cada atividade explica o caminho, e você pode tentar de novo.") +
    (due ? `<aside class="hub-recommendation panel"><span class="hub-card-symbol lavender" aria-hidden="true">${icon("repeat")}</span><div><p class="eyebrow">ANTES DE ALGO NOVO</p><h2>${due === 1 ? "Uma revisão esperando por você." : due + " revisões esperando por você."}</h2><p>Reencontre o que já estudou enquanto ainda está fresco na memória.</p></div>${routeLink("review", "Revisar agora " + icon("arrow"), "btn btn-primary")}</aside>` : "") +
    `<div class="hub-grid practice-hub-grid">${PRACTICE_TOOLS.map(item => card(item, "h2")).join("")}</div><aside class="hub-note"><span class="hanko small-hanko" aria-hidden="true">あ</span><div><h2>Ainda não sabe por onde começar?</h2><p>A trilha apresenta cada ideia antes de pedir que você pratique.</p>${routeLink(stepRoute(next), next ? "Seguir minha trilha " + icon("arrow") : "Rever minha trilha " + icon("arrow"), "text-link")}</div></aside><div class="hub-paper-link">${icon("pen")}<p>Prefere treinar no papel? ${routeLink("worksheets", "Abrir atividades para imprimir", "text-link")}</p></div>`;
}

export function renderExplore(ctx) {
  const controller = new AbortController();
  let query = "", group = "all";
  try {
    const saved = JSON.parse(sessionStorage.getItem("maru-explore-filter"));
    if (typeof saved?.query === "string") query = saved.query.slice(0, 100);
    if (RESOURCE_GROUPS.some(item => item.id === saved?.group)) group = saved.group;
  } catch {}
  ctx.main.innerHTML = pageHeading("UM IDIOMA, MUITAS DESCOBERTAS", "Encontre o que precisa.", "Tabelas, palavras, cultura e materiais para acompanhar seus jogos. Consulte quando surgir uma dúvida ou curiosidade.") +
    `<div class="explore-controls"><div class="explore-search" role="search"><label for="resource-search">O que você quer explorar?</label><div class="search-field">${icon("search")}<input id="resource-search" type="search" maxlength="100" placeholder="Kana, gírias, folhas de repetição…" value="${esc(query)}" autocomplete="off" aria-controls="explore-results"></div></div><div class="explore-filters" role="group" aria-label="Filtrar recursos">${[{id:"all", title:"Tudo"}, ...RESOURCE_GROUPS].map(item => `<button class="chip" data-resource-group="${item.id}" aria-pressed="${group === item.id}">${item.title}</button>`).join("")}</div></div><div class="explore-results-heading"><p id="resource-count" role="status" aria-live="polite"></p><button class="text-link" id="clear-resource-filters">Limpar filtros ${icon("close")}</button></div><div id="explore-results"></div>`;
  const input = ctx.main.querySelector("#resource-search");
  const renderResults = () => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const matching = RESOURCES.filter(item => (group === "all" || item.group === group) && terms.every(term => normalize([item.title, item.description, item.keywords].join(" ")).includes(term)));
    ctx.main.querySelector("#resource-count").textContent = matching.length + (matching.length === 1 ? " recurso para explorar" : " recursos para explorar");
    ctx.main.querySelector("#clear-resource-filters").hidden = !query && group === "all";
    ctx.main.querySelectorAll("[data-resource-group]").forEach(button => {
      const active = button.dataset.resourceGroup === group;
      button.setAttribute("aria-pressed", String(active)); button.classList.toggle("is-active", active);
    });
    ctx.main.querySelector("#explore-results").innerHTML = matching.length ? RESOURCE_GROUPS.map(section => {
      const items = matching.filter(item => item.group === section.id);
      return items.length ? `<section class="hub-section" aria-labelledby="group-${section.id}"><div class="hub-section-heading"><h2 id="group-${section.id}">${section.title}</h2><p>${section.description}</p></div><div class="hub-grid">${items.map(item => card(item)).join("")}</div></section>` : "";
    }).join("") : `<div class="hub-empty"><span aria-hidden="true">${icon("search")}</span><h2>Nenhum recurso por aqui ainda.</h2><p>Tente outro termo ou limpe os filtros para ver todos os materiais.</p></div>`;
    try { sessionStorage.setItem("maru-explore-filter", JSON.stringify({ query, group })); } catch {}
  };
  input.addEventListener("input", () => { query = input.value; renderResults(); }, { signal: controller.signal });
  ctx.main.addEventListener("click", event => {
    const filter = event.target.closest("[data-resource-group]");
    if (filter) { group = filter.dataset.resourceGroup; renderResults(); }
    if (event.target.closest("#clear-resource-filters")) { query = ""; group = "all"; input.value = ""; renderResults(); input.focus(); }
  }, { signal: controller.signal });
  renderResults();
  return () => controller.abort();
}
