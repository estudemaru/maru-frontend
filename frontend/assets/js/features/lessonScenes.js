import { esc, exampleHTML } from '../core/ui.js';

// As cenas acompanham a leitura. No quiz, uma pose neutra não dá pistas da resposta.
export const readingScene = examples => examples.some(example => /コーヒー|ケーキ/.test(example.jp)) ? 'cafe' : 'study';
export const lessonArt = (scene = 'study', className = 'lesson-scene-art') => `<img class="${className}" src="/assets/img/irasutoya-lesson-${scene}.png" alt="" width="160" height="160" decoding="async">`;
export const lessonArtCredit = '<small class="lesson-art-credit">Ilustrações: Mifune Takashi / <a href="https://www.irasutoya.com/" target="_blank" rel="noopener noreferrer">Irasutoya</a></small>';

const wordArt = new Map([
  ['ねこ', 'cat'], ['猫', 'cat'], ['いぬ', 'dog'], ['犬', 'dog'],
  ['さかな', 'fish'], ['魚', 'fish'], ['みず', 'water'], ['水', 'water'],
  ['木', 'tree'], ['ほん', 'book'], ['本', 'book'], ['かさ', 'umbrella'], ['傘', 'umbrella'],
  ['パン', 'bread'], ['ぱん', 'bread'], ['コーヒー', 'coffee'], ['ケーキ', 'cake'],
  ['ごはん', 'rice'], ['ご飯', 'rice'], ['電車', 'train'], ['でんしゃ', 'train'],
  ['たまご', 'egg'], ['卵', 'egg'], ['りんご', 'apple']
]);
export const exampleIllustration = example => example.image || wordArt.get(example.jp.trim());
export const illustratedExampleHTML = (example, romaji) => {
  const image = exampleIllustration(example);
  return image ? `<div class="lesson-example-scene"><img class="lesson-word-art" src="/assets/img/irasutoya-${esc(image)}.png" alt="" width="80" height="80" loading="lazy">${exampleHTML({ ...example, image: null }, romaji)}</div>` : exampleHTML(example, romaji);
};
