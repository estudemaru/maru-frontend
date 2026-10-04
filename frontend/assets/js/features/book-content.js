import { BOOK_NOTES } from './book-notes.js';
import { interleaveKanaLesson } from './book-kana.js';
import { MODULES } from '../../../../shared/curriculum.js';
import { BEGINNER_KANJI, SENTENCES, PARTICLES, EXPRESSIONS } from '../../../../shared/catalog.js';
import { VOCABULARY } from '../../../../shared/vocabulary.js';
import { PARTICLE_EXERCISES } from '../../../../shared/exercises.js';
import { PRINT_DIALOGUES } from '../../../../shared/printActivities.js';
import { furiganaSegments } from '../../../../shared/furigana.js';

// This progression belongs to the printed beginner book; the online course
// retains its own modules and complete kanji catalogue.
export const BOOK_KANJI = [...'一二三人日月山川木水'].map(char => BEGINNER_KANJI.find(item => item.char === char));
export const BOOK_KANA_ORDER = ['a', 'ka', 'ga', 'sa', 'za', 'ta', 'da', 'na', 'ha', 'ba', 'pa', 'ma', 'ya', 'ra', 'wa'];
// The online journey later split hiragana and katakana into one lesson per row; the
// printed book already interleaves every family, so it keeps its original lessons.
const ONLINE_ONLY = new Set(['h-ka', 'h-sa', 'h-ta', 'h-na', 'h-ha', 'h-ma', 'h-yara', 'h-dakuten', 'k-sata', 'k-naha', 'k-mawa']);
const flat = text => String(text || '').replace(/\n• /g, ' · ').replace(/\n/g, ' ');
export const BOOK_MODULES = MODULES.filter(module => module.id !== 'kanji').map((module, index) => ({
  ...module, number: String(index + 1).padStart(2, '0'),
  lessons: module.lessons.filter(source => !ONLINE_ONLY.has(source.id)).map(source => {
    const lesson = { ...source, sections: source.sections.map((section, index) => ({ ...section, body: BOOK_NOTES[source.id]?.[index] || flat(section.body) })) };
    if (lesson.id !== 'welcome') return interleaveKanaLesson(lesson);
    return { ...lesson, goal: 'Começar pelos sons, pelo hiragana e pelo katakana.', sections: lesson.sections.map((section, index) => {
      if (index === 1) return { ...section, title: 'Primeiro, hiragana e katakana', examples: section.examples.slice(0, 2), tip: 'Aprenda os sons com calma. Romaji é um apoio de leitura em letras latinas.' };
      if (index === 2) return { ...section, examples: section.examples.map(example => ({ ...example, note: 'パン está em katakana; をたべます está em hiragana.' })) };
      return section;
    }) };
  })
}));
export const BOOK_LESSONS = BOOK_MODULES.flatMap(module => module.lessons);

// Prefer complete, authored readings over per-character guesses. The shorter
// aligned runs cover Japanese quoted inside Portuguese instructions and hints.
const readings = new Map();
const add = (text, reading) => {
  if (!text || !reading || !/[\p{Script=Han}々]/u.test(text)) return;
  readings.set(text, reading);
  const bare = text.replace(/[。？！?！]+$/u, '');
  if (bare !== text) readings.set(bare, reading.replace(/[。？！?！]+$/u, ''));
};
const pairs = [];
BEGINNER_KANJI.forEach(item => pairs.push([item.char, item.reading], [item.word, item.wordReading]));
VOCABULARY.forEach(item => pairs.push([item.jp, item.reading], [item.sentence, item.sentenceReading]));
SENTENCES.forEach(item => item.tokens.forEach(token => pairs.push([token[0], token[3]])));
[...PARTICLES, ...EXPRESSIONS].forEach(item => pairs.push([item.jp, item.reading]));
MODULES.forEach(module => module.lessons.forEach(lesson => lesson.sections.forEach(section => section.examples.forEach(item => pairs.push([item.jp, item.reading])))));
PARTICLE_EXERCISES.forEach(item => pairs.push([item.prompt, item.reading], [item.speech, item.reading?.replace('＿', item.answer)]));
PRINT_DIALOGUES.forEach(dialogue => dialogue.turns.forEach(turn => pairs.push([turn.text, turn.reading], [turn.answer, turn.answerReading])));
const runs = new Map();
for (const [text, reading] of pairs) {
  for (const segment of furiganaSegments(text, reading) || []) {
    if (!segment.kanji) continue;
    const values = runs.get(segment.text) || new Set();
    values.add(segment.reading);
    runs.set(segment.text, values);
  }
}
for (const [text, values] of runs) if (values.size === 1) add(text, [...values][0]);
for (const [text, reading] of pairs) add(text, reading);
// Readings for short quotations without a reading field in the source prose.
Object.entries({ '結構': 'けっこう', '好き': 'すき', '来ます': 'きます', '左': 'ひだり', '三百': 'さんびゃく', '九時': 'くじ', '百': 'ひゃく', '円': 'えん', '時': 'じ', '半': 'はん', '米': 'こめ' }).forEach(([text, reading]) => add(text, reading));
const pattern = new RegExp([...readings.keys()].sort((a, b) => b.length - a.length).map(text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');
export const bookKanaText = text => String(text).replace(pattern, match => readings.get(match));

export function bookKanaHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  // Ruby readings are specific to the phrase and take priority over the lexicon.
  template.content.querySelectorAll('ruby').forEach(ruby => ruby.replaceWith(ruby.querySelector('rt').textContent));
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) walker.currentNode.textContent = bookKanaText(walker.currentNode.textContent);
  return template.innerHTML;
}
