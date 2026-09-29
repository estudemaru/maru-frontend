import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPool, makeDeck, reviewPrefix } from '../shared/arcade.js';
import { dealRound, createRounds, roundScore, TABLE_SIZE } from '../shared/karuta.js';
import { getPronunciation } from '../shared/pronunciation.js';
import { startKana } from '../shared/shiritori.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('every karuta card can be spoken by the voice API and shows the chosen script', () => {
  const kana = buildPool({ game: 'karuta', script: 'kana' });
  const written = buildPool({ game: 'karuta', script: 'all' });
  assert.ok(kana.length >= 60);
  assert.ok(kana.every(item => getPronunciation(item.speak)), 'o servidor só aceita textos do catálogo');
  assert.ok(kana.every(item => !/[一-龯]/u.test(item.card)));
  assert.equal(written.find(item => item.id === 'word-cat').card, '猫');
  assert.equal(reviewPrefix({ game: 'karuta', script: 'kana' }), 'arcade:karuta:kana:listen:');
});

test('a round has six distinct cards, one answer and look-alike distractors', () => {
  const pool = buildPool({ game: 'karuta', script: 'kana' });
  const random = seeded(4);
  for (const target of pool) {
    const { cards } = dealRound(target, pool, { random });
    assert.equal(cards.length, TABLE_SIZE);
    assert.equal(cards.filter(card => card.id === target.id).length, 1);
    assert.equal(new Set(cards.map(card => card.card)).size, TABLE_SIZE);
    assert.equal(new Set(cards.map(card => card.reading)).size, TABLE_SIZE);
  }
  const target = pool.find(item => item.reading === 'たまご');
  const { cards } = dealRound(target, pool, { random: seeded(2) });
  assert.ok(cards.some(card => card !== target && startKana(card.reading) === 'た'), 'uma carta começa com o mesmo som');
});

test('the next round is always dealt before the current one is played', () => {
  const pool = buildPool({ game: 'karuta', script: 'all' });
  const rounds = createRounds(makeDeck(pool, {}, '', seeded(9)), pool, { random: seeded(9) });
  const upcoming = rounds.upcoming;
  assert.equal(rounds.next(), upcoming);
  assert.ok(rounds.upcoming && rounds.upcoming !== upcoming);
});

test('karuta scoring matches the arcade bonus', () => {
  assert.equal(roundScore(false, 0), 0);
  assert.equal(roundScore(true, 1), 100);
  assert.equal(roundScore(true, 3), 120);
  assert.equal(roundScore(true, 20), 150);
});
