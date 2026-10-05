import { bookKanaText } from './book-content.js';
import { esc } from '../core/html.js';

const pictures = [
  ['コーヒー', 'coffee', 'café'], ['ケーキ', 'cake', 'bolo'], ['りんご', 'apple', 'maçã'],
  ['さかな', 'fish', 'peixe'], ['たまご', 'egg', 'ovo'], ['ごはん', 'rice', 'arroz'],
  ['ねこ', 'cat', 'gato'], ['いぬ', 'dog', 'cachorro'], ['みず', 'water', 'água'],
  ['パン', 'bread', 'pão'], ['ほん', 'book', 'livro'], ['かさ', 'umbrella', 'guarda-chuva'],
  ['でんしゃ', 'train', 'trem']
];
export function bookPicture(example) {
  if (example.image) return { id: example.image, label: example.pt };
  const text = bookKanaText(example.reading || example.jp || '');
  // Match whole words or words followed by a particle, not arbitrary substrings
  // (e.g. the hon in nihongo is not the word for book).
  const match = pictures.find(([word]) => text === word || text.startsWith(word + '。') || new RegExp(`(?:^|[、。\\s])${word}(?:[はがをにでともの]|$)`).test(text));
  return match ? { id: match[1], label: match[2] } : null;
}
export const bookPictureHTML = picture => picture ? `<img class="paper-learning-image" src="/assets/img/irasutoya-${esc(picture.id)}.webp" alt="${esc(picture.label)}" width="120" height="120">` : '';

export function exampleKind(example) {
  const text = bookKanaText(example.reading || example.jp).trim();
  if (text.split(/\s+/u).length > 1 && text.split(/\s+/u).every(part => /^[ぁ-ヺー]{1,2}$/u.test(part))) return 'kana-row';
  if ([...text].length === 1) return 'character';
  if (text.includes('→')) return 'contrast';
  return [...text].length <= 8 && !/[。？！?!]/u.test(text) ? 'word' : 'sentence';
}

export function bookExample(example, id) {
  const text = bookKanaText(example.reading || example.jp);
  const kind = exampleKind(example);
  const picture = bookPicture(example);
  const japanese = kind === 'kana-row' ? `<div class="paper-kana-strip">${text.trim().split(/\s+/u).map(char => `<span lang="ja">${esc(char)}</span>`).join('')}</div>` : `<div class="paper-example-japanese" lang="ja">${esc(text)}</div>`;
  return `<article class="paper-example-card" data-book-example="${id}" data-example-kind="${kind}">${bookPictureHTML(picture)}<div class="paper-example-copy">${japanese}<p class="paper-example-reading">${esc(example.romaji)}</p><p class="paper-example-meaning">${esc(example.pt)}</p>${example.note ? `<p class="paper-example-note">${esc(bookKanaText(example.note))}</p>` : ''}</div></article>`;
}

export function exampleRows(examples, sectionId) {
  const rows = [];
  for (let index = 0; index < examples.length;) {
    const kind = exampleKind(examples[index]);
    const count = kind === 'character' ? 5 : kind === 'word' ? 2 : 1;
    const group = [];
    while (index < examples.length && group.length < count && exampleKind(examples[index]) === kind) {
      group.push(bookExample(examples[index], `${sectionId}:${index}`));
      index++;
    }
    rows.push(`<div class="paper-example-grid" data-example-layout="${kind}" data-count="${group.length}">${group.join('')}</div>`);
  }
  return rows;
}

// Each sentence is retained; two short paragraphs replace a dense text block.
export function bookExplanation(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(?:[”’»])?|[^.!?]+$/gu) || [text];
  if (sentences.length < 3 || text.length < 190) return `<p>${esc(text)}</p>`;
  const middle = Math.ceil(sentences.length / 2);
  return `<p>${esc(sentences.slice(0, middle).join('').trim())}</p><p>${esc(sentences.slice(middle).join('').trim())}</p>`;
}

// Meaning sketches, not claims about historical character origins.
export function kanjiSketch(char) {
  const drawings = {
    '一': '<circle cx="40" cy="40" r="10"/>',
    '二': '<circle cx="24" cy="40" r="9"/><circle cx="56" cy="40" r="9"/>',
    '三': '<circle cx="17" cy="40" r="8"/><circle cx="40" cy="40" r="8"/><circle cx="63" cy="40" r="8"/>',
    '人': '<circle cx="40" cy="20" r="10"/><path d="M23 68V49a17 17 0 0 1 34 0v19Z"/>',
    '日': '<circle cx="40" cy="40" r="17"/><path d="M40 6v7m0 54v7M6 40h7m54 0h7M16 16l5 5m38 38 5 5M16 64l5-5m38-38 5-5"/>',
    '月': '<path d="M54 10A29 29 0 1 0 68 57 30 30 0 0 1 54 10Z"/>',
    '山': '<path d="M6 66 28 22l12 23 11-31 23 52ZM21 37l7 6 7-7m9 0 7 5 8-5"/>',
    '川': '<path d="M22 8c27 19-19 43 4 64M40 8c27 19-19 43 4 64M58 8c27 19-19 43 4 64"/>',
    '木': '<path d="M35 51v21h10V51"/><path d="M20 50a13 13 0 0 1-4-25A16 16 0 0 1 46 14a16 16 0 0 1 20 21 12 12 0 0 1-6 22H24Z"/>',
    '水': '<path d="M40 7C32 23 17 35 17 48a23 23 0 0 0 46 0C63 35 48 23 40 7Z"/><path d="M28 48a12 12 0 0 0 12 12"/>'
  };
  return `<svg class="paper-meaning-sketch" viewBox="0 0 80 80" aria-hidden="true" focusable="false">${drawings[char]}</svg>`;
}
