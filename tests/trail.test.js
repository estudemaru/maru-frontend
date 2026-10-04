import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULES, LESSONS, getLesson } from '../shared/curriculum.js';
import { KANA } from '../shared/content.js';
import { CHANNELS, VIDEOS, videosFor, videoEmbedURL } from '../shared/videos.js';
import { GAMES, buildPool } from '../shared/arcade.js';
import { rendaPool, rendaQuestion, rendaReviewKey, MEMORY_HINTS, RENDA_CHOICES } from '../shared/renda.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('every video points to real lessons and a known channel, and Portuguese comes first', () => {
  assert.equal(new Set(VIDEOS.map(video => video.id)).size, VIDEOS.length, 'sem vídeo repetido');
  for (const video of VIDEOS) {
    assert.match(video.id, /^[\w-]{11}$/, video.id);
    assert.ok(CHANNELS[video.channel], video.id);
    assert.ok(video.minutes > 0 && video.title.length > 3, video.id);
    assert.ok(video.lessons.length && video.lessons.every(getLesson), video.id);
  }
  // A maior parte da trilha tem aula em vídeo; todas as famílias de kana têm.
  assert.ok(LESSONS.filter(lesson => videosFor(lesson.id).length).length >= 45);
  for (const id of ['h-vowels', 'h-ka', 'h-sa', 'h-ta', 'h-na', 'h-ha', 'h-ma', 'h-yara', 'h-rest', 'h-dakuten', 'k-basics', 'k-sata', 'k-naha', 'k-mawa']) assert.ok(videosFor(id).length, id);
  for (const lesson of LESSONS) {
    const languages = videosFor(lesson.id).map(video => CHANNELS[video.channel].lang);
    assert.deepEqual(languages, [...languages].sort((a, b) => (a === 'pt' ? 0 : 1) - (b === 'pt' ? 0 : 1)), lesson.id);
  }
  assert.match(videoEmbedURL(VIDEOS[0]), /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?/);
});

test('each of the 92 basic kana is taught on its own card with a memory hint', () => {
  for (const item of KANA.filter(kana => kana.group === 'seion')) assert.ok(MEMORY_HINTS.get(item.char), `${item.char} precisa de uma dica de memória`);
  const hiragana = MODULES.find(module => module.id === 'hiragana').lessons.map(lesson => lesson.id);
  assert.deepEqual(hiragana.slice(0, 6), ['h-vowels', 'h-ka', 'h-sa', 'h-ta', 'h-na', 'h-ha'], 'uma família por lição, na ordem da tabela');
});

test('Só mais um deals four distinct choices that never sound alike', () => {
  for (const script of ['hiragana', 'katakana', 'kana', 'kanji', 'all']) {
    const pool = rendaPool({ script, range: 'all' });
    const random = seeded(script.length);
    for (const item of pool) for (const mode of ['read', 'find']) {
      const question = rendaQuestion(item, pool, mode, random);
      assert.equal(question.choices.length, RENDA_CHOICES, `${script} ${item.char}`);
      assert.equal(question.choices.filter(choice => choice.key === item.id).length, 1);
      assert.equal(new Set(question.choices.map(choice => choice.main)).size, RENDA_CHOICES, `${script} ${item.char}: opções repetidas`);
      const chars = question.choices.map(choice => pool.find(entry => entry.id === choice.key).char);
      assert.ok(!(chars.includes('を') && chars.includes('お')) && !(chars.includes('じ') && chars.includes('ぢ')) && !(chars.includes('ず') && chars.includes('づ')), chars.join(''));
      assert.ok(chars.every(char => /[一-龯]/u.test(char) === (item.kind === 'kanji')), 'kana com kana, kanji com kanji');
    }
  }
});

test('the trail scope only uses what the journey already taught', () => {
  const vowels = rendaPool({ script: 'hiragana', rows: ['a'] });
  assert.deepEqual(vowels.map(item => item.char), ['あ', 'い', 'う', 'え', 'お']);
  const marks = rendaPool({ script: 'hiragana', rows: ['a', 'ka'], groups: ['dakuten'] });
  assert.ok(marks.some(item => item.char === 'が') && marks.some(item => item.char === 'ぱ') && !marks.some(item => item.char === 'さ') && !marks.some(item => item.char === 'きゃ'));
  assert.equal(rendaPool({ script: 'kana', range: 'basic' }).length, 92);
  assert.equal(rendaPool({ script: 'kanji' }).length, 20);
});

test('Só mais um shares review cards across selections and shows up in Meu desempenho', () => {
  assert.equal(GAMES[0].id, 'renda');
  const [item] = rendaPool({ script: 'kana', range: 'basic' });
  assert.equal(rendaReviewKey(item, 'read'), 'arcade:renda:hiragana:read:h-a-0');
  const labels = buildPool({ game: 'renda', script: 'hiragana' });
  assert.ok(labels.find(entry => entry.id === 'h-a-0').label.startsWith('あ'));
});
