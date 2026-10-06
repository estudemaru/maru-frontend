import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LESSONS, getModule } from "../shared/curriculum.js";

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf("--" + name); return i < 0 ? "" : args[i + 1] || ""; };
const id = option("id"), moduleId = option("module"), title = option("title");
if (!/^[a-z][a-z0-9-]{2,59}$/.test(id) || !getModule(moduleId) || !title || title.startsWith("--") || LESSONS.some(item => item.id === id)) {
  console.error('Uso: npm run content:new -- --id identificador-novo --module routine --title "Título da lição"\nEscolha um ID novo e uma das unidades existentes (ou um extra).');
  process.exitCode = 1;
} else {
  const draft = {
    id, moduleId, title, status: "draft", minutes: 5,
    goal: "REVISAR: descreva o que a pessoa será capaz de fazer.",
    sections: [1, 2].map(i => ({
      title: "REVISAR: explicação " + i,
      body: "REVISAR: explique em português, partindo do zero.",
      examples: [{ jp: "REVISAR", romaji: "REVISAR", pt: "REVISAR", note: "REVISAR: contexto e uso." }],
      tip: "REVISAR: antecipe uma dúvida comum."
    })),
    quiz: [1, 2, 3].map(i => ({
      prompt: "REVISAR: pergunta " + i,
      choices: ["REVISAR: resposta correta", "REVISAR: distrator 1", "REVISAR: distrator 2"],
      answer: 0, explanation: "REVISAR: por que a resposta funciona neste contexto?"
    })),
    practice: null
  };
  const directory = path.resolve("docs/drafts");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, id + ".js");
  try {
    await writeFile(file, "// Rascunho editorial. Não faz parte da trilha publicada.\nexport default " + JSON.stringify(draft, null, 2) + ";\n", { flag: "wx" });
    console.log("Rascunho criado: docs/drafts/" + id + ".js\nRevise com docs/EDITORIAL-CHECKLIST.md antes de integrar ao currículo.");
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    console.error("Já existe um rascunho com esse ID. Nenhum arquivo foi sobrescrito."); process.exitCode = 1;
  }
}
