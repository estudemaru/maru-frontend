// Letra dos kana e kanji nos jogos. Cada pessoa escolhe a que lê melhor.
// Mincho e gótica já vêm com a página; as outras só são baixadas quando escolhidas
// (e, na tela de ajustes, só com os caracteres da amostra).
export const JP_FONTS = [
  { id: "mincho", name: "Mincho clássica", family: "Shippori Mincho", note: "Traço de livro impresso, com serifas finas. A letra padrão do Maru.", google: "Shippori+Mincho:wght@500", bundled: true },
  { id: "gothic", name: "Gótica", family: "Noto Sans JP", note: "Linhas uniformes e retas, como em placas e aplicativos.", google: "Noto+Sans+JP:wght@500", bundled: true },
  { id: "kyokasho", name: "Caderno escolar", family: "Klee One", note: "Formas de quem escreve à mão, como nos livros didáticos. Ajuda a ver a ordem dos traços.", google: "Klee+One:wght@600" },
  { id: "maru", name: "Arredondada", family: "Zen Maru Gothic", note: "Pontas suaves e espaçosas. Confortável para leituras longas.", google: "Zen+Maru+Gothic:wght@500" },
  { id: "rounded", name: "Arredondada firme", family: "M PLUS Rounded 1c", note: "Traço mais grosso e aberto, fácil de ler em telas pequenas.", google: "M+PLUS+Rounded+1c:wght@500" },
  { id: "pen", name: "Caneta", family: "Zen Kurenaido", note: "Letra de caneta, informal. Bom treino para ler bilhetes e anotações.", google: "Zen+Kurenaido" }
];
export const SAMPLE = "あいう アイウ 日本語";
const FALLBACK = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
const loaded = new Set();
const fontOf = id => JP_FONTS.find(font => font.id === id) || JP_FONTS[0];
function stylesheet(href) {
  if (loaded.has(href)) return;
  loaded.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = href;
  document.head.append(link);
}

export function applyJpFont(id) {
  const font = fontOf(id);
  if (!font.bundled) stylesheet(`https://fonts.googleapis.com/css2?family=${font.google}&display=swap`);
  document.documentElement.dataset.jpFont = font.id;
  document.documentElement.style.setProperty("--font-game-jp", `"${font.family}", ${FALLBACK}`);
}

// Na tela de ajustes: baixa só os caracteres usados nas amostras de cada fonte.
export function loadPreviews(text) {
  for (const font of JP_FONTS) if (!font.bundled) stylesheet(`https://fonts.googleapis.com/css2?family=${font.google}&text=${encodeURIComponent(text)}&display=swap`);
}
