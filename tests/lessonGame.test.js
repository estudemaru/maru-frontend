import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from '../shared/curriculum.js';
import { lessonGame, LESSON_ROUNDS } from '../shared/lessonGame.js';
import { getPronunciation } from '../shared/pronunciation.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('every lesson ends with a playable game built from its own examples', () => {
  for (const lesson of LESSONS) {
    const game = lessonGame(lesson, { random: seeded(lesson.id.length) });
    assert.ok(game.rounds.length >= 3 && game.rounds.length <= LESSON_ROUNDS, lesson.id);
    assert.equal(new Set(game.rounds.map(round => round.target.id)).size, game.rounds.length, 'sem alvo repetido');
    for (const { target, cards } of game.rounds) {
      assert.ok(target.id.startsWith(lesson.id + ':'), 'o alvo vem da própria lição');
      assert.ok(getPronunciation(target.speak), `${target.speak} precisa estar no catálogo de voz`);
      assert.ok(cards.length >= 3 && cards.length <= 4);
      assert.equal(cards.filter(card => card.id === target.id).length, 1);
      assert.equal(new Set(cards.map(card => card.sound)).size, cards.length, `${lesson.id}: cartas que soam igual`);
      assert.equal(new Set(cards.map(card => card.romaji)).size, cards.length, `${lesson.id}: leituras repetidas`);
    }
  }
});

test('sound and conversation themes listen; kanji, sentences and particles read', () => {
  const kinds = Object.fromEntries(LESSONS.map(lesson => [lesson.theme, lessonGame(lesson).kind]));
  assert.deepEqual(kinds, { start: 'listen', hiragana: 'listen', katakana: 'listen', kanji: 'read', sentences: 'read', particles: 'read', everyday: 'listen', numbers: 'read', casual: 'listen' });
});

test('kana rows become one card per sound and を never shares a table with お', () => {
  const rows = LESSONS.find(lesson => lesson.id === 'h-rows');
  const game = lessonGame(rows, { random: seeded(3) });
  assert.ok(game.rounds.every(round => round.cards.every(card => !card.card.includes('　'))));
  const rest = LESSONS.find(lesson => lesson.id === 'h-rest');
  for (let seed = 1; seed < 40; seed++) {
    for (const { cards } of lessonGame(rest, { random: seeded(seed) }).rounds) assert.ok(!(cards.some(card => card.card === 'を') && cards.some(card => card.card === 'お')));
  }
});
