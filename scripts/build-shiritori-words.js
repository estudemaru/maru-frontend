// Gera frontend/assets/data/shiritori-words.json a partir do JMdict (edição
// jmdict-simplified, somente palavras comuns). A atualização é manual:
//
//   1. Baixe jmdict-eng-common-<versão>.json.zip em
//      https://github.com/scriptin/jmdict-simplified/releases e descompacte.
//   2. node scripts/build-shiritori-words.js caminho/jmdict-eng-common.json
//
// O uso normal do site não precisa da rede nem do arquivo original.
import { readFileSync, writeFileSync } from "node:fs";

const source = process.argv[2];
if (!source) {
  console.error("Uso: node scripts/build-shiritori-words.js caminho/jmdict-eng-common.json");
  process.exit(1);
}
const dict = JSON.parse(readFileSync(source, "utf8"));
// Registros que não fazem sentido num jogo para iniciantes.
const SKIP_MISC = new Set(["vulg", "derog", "X", "sens", "arch", "obs", "rare", "obsc", "dated"]);
const KANA_ONLY = /^[ぁ-ゖァ-ヺー]+$/u;
const toHiragana = text => text.replace(/[ァ-ヶ]/gu, char => String.fromCharCode(char.charCodeAt(0) - 0x60));

const seen = new Set();
const words = [];
for (const entry of dict.words) {
  const senses = entry.sense || [];
  if (!senses.length || !senses[0].partOfSpeech.some(pos => pos === "n")) continue;
  if (senses.some(sense => sense.misc.some(tag => SKIP_MISC.has(tag)))) continue;
  const kana = entry.kana.find(item => item.common && !item.tags.includes("ik") && !item.tags.includes("ok")) || entry.kana.find(item => item.common);
  if (!kana || !KANA_ONLY.test(kana.text)) continue;
  const length = [...kana.text].length;
  if (length < 2 || length > 8) continue;
  // Palavras que a própria entrada marca como escritas normalmente em kana ficam sem kanji.
  const usuallyKana = senses[0].misc.includes("uk");
  const kanji = usuallyKana ? null : entry.kanji.find(item => item.common && (kana.appliesToKanji.includes("*") || kana.appliesToKanji.includes(item.text)));
  const written = kanji ? kanji.text : kana.text;
  const key = toHiragana(kana.text) + "|" + written;
  if (seen.has(key)) continue;
  seen.add(key);
  words.push(written === kana.text ? [kana.text] : [kana.text, written]);
}
words.sort((a, b) => a[0].localeCompare(b[0], "ja"));
const output = {
  source: "JMdict/EDICT, Electronic Dictionary Research and Development Group, via jmdict-simplified",
  license: "CC BY-SA 4.0",
  dictDate: dict.dictDate,
  // Cada item: [leitura em kana, forma escrita quando diferente da leitura].
  words
};
writeFileSync(new URL("../frontend/assets/data/shiritori-words.json", import.meta.url), JSON.stringify(output));
console.log(`${words.length} palavras gravadas (JMdict ${dict.dictDate}).`);
