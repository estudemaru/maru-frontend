import { CHANNELS, VIDEOS, videoURL, videoEmbedURL, videoThumbnail } from "/shared/videos.js";
import { esc, icon, wideScreen } from "./ui.js";

// Aula do YouTube com carregamento sob demanda: até o clique, a página mostra só a
// miniatura; o player (youtube-nocookie) entra no lugar dela quando a pessoa toca.
const meta = video => `${CHANNELS[video.channel].name} · ${video.minutes} min${CHANNELS[video.channel].lang === "en" ? " · em inglês" : ""}`;
const caption = video => `<div class="video-caption"><strong>${esc(video.title)}</strong><span>${esc(meta(video))}</span><a href="${videoURL(video)}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ${icon("external")}<span class="sr-only"> · abre em outra aba</span></a></div>`;
const poster = video => `<button type="button" class="video-poster" data-play-video="${video.id}" aria-label="Assistir aqui: ${esc(video.title)}, ${esc(meta(video))}"><img src="${videoThumbnail(video)}" alt="" width="320" height="180" loading="lazy"><span class="video-play" aria-hidden="true">${icon("play")}</span><span class="video-length" aria-hidden="true">${video.minutes} min</span></button>${caption(video)}`;

export function videoPanelHTML(videos, { eyebrow = "AULA EM VÍDEO", heading = "Prefere ver antes de ler?" } = {}) {
  if (!videos.length) return "";
  const [first, ...rest] = videos;
  return `<section class="video-panel" aria-label="Aulas em vídeo"><div class="video-panel-head"><p class="eyebrow">${eyebrow}</p><h3>${heading}</h3></div><div class="video-stage" data-video-stage>${poster(first)}</div>${rest.length ? `<details class="video-more"${wideScreen() ? " open" : ""}><summary>${rest.length === 1 ? "Mais uma aula sobre o tema" : `Mais ${rest.length} aulas sobre o tema`}${icon("down")}</summary><ul class="video-list">${rest.map(video => `<li><button type="button" class="video-option" data-play-video="${video.id}"><img src="${videoThumbnail(video)}" alt="" width="96" height="54" loading="lazy"><span><strong>${esc(video.title)}</strong><small>${esc(meta(video))}</small></span></button></li>`).join("")}</ul></details>` : ""}<p class="video-credit">Canais independentes do YouTube, sem ligação com o Maru. O vídeo só carrega quando você toca no play.</p></section>`;
}

// Um ouvinte por tela: troca a miniatura pelo player e marca a aula escolhida na lista.
export function bindVideos(root, signal, onPlay = () => {}) {
  root.addEventListener("click", event => {
    const trigger = event.target.closest("[data-play-video]");
    if (!trigger) return;
    const video = VIDEOS.find(item => item.id === trigger.dataset.playVideo);
    // Uma lista fora do painel (como em Aulas gratuitas) toca no primeiro player da tela.
    const panel = trigger.closest(".video-panel") || root.querySelector(".video-panel");
    const stage = panel?.querySelector("[data-video-stage]");
    if (!video || !stage) return;
    onPlay(video);
    stage.innerHTML = `<div class="video-frame"><iframe src="${videoEmbedURL(video)}" title="${esc(video.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>${caption(video)}`;
    root.querySelectorAll(".video-option").forEach(option => option.setAttribute("aria-pressed", String(option.dataset.playVideo === video.id)));
    stage.querySelector("iframe").focus({ preventScroll: true });
    if (trigger.classList.contains("video-option")) stage.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, { signal });
}
