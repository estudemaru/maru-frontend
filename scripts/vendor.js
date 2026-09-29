// Copia as bibliotecas de terceiros para arquivos servidos direto, sem etapa de build.
// Rode depois de atualizar as versões no package.json:  npm install && npm run vendor
//
// - ts-fsrs (agendamento FSRS da revisão) vai para shared/vendor/, porque shared/progress.js
//   roda no navegador, no Node e na Edge Function. Copie também para maru-backend/shared/vendor/.
// - wanakana (romaji → kana enquanto se digita) só roda no navegador: frontend/assets/vendor/.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const libraries = [
  { name: "ts-fsrs", source: "node_modules/ts-fsrs/dist/index.mjs", license: "node_modules/ts-fsrs/LICENSE", target: "shared/vendor/ts-fsrs.js", url: "https://github.com/open-spaced-repetition/ts-fsrs" },
  { name: "wanakana", source: "node_modules/wanakana/esm/index.js", license: "node_modules/wanakana/LICENSE", target: "frontend/assets/vendor/wanakana.js", url: "https://github.com/WaniKani/WanaKana" }
];
for (const library of libraries) {
  const { version, license } = JSON.parse(readFileSync(path.join(root, "node_modules", library.name, "package.json"), "utf8"));
  const code = readFileSync(path.join(root, library.source), "utf8").replace(/\n\/\/# sourceMappingURL=.*\s*$/, "\n");
  const banner = `/*! ${library.name} ${version} · ${license} · ${library.url} · gerado por scripts/vendor.js; não edite à mão. */\n`;
  mkdirSync(path.dirname(path.join(root, library.target)), { recursive: true });
  writeFileSync(path.join(root, library.target), banner + code);
  // A licença MIT pede que o aviso completo acompanhe cada cópia.
  writeFileSync(path.join(root, path.dirname(library.target), `LICENSE-${library.name}.txt`), readFileSync(path.join(root, library.license), "utf8"));
  console.log(`${library.name} ${version} → ${library.target}`);
}
