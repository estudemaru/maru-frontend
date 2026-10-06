import test from 'node:test';
import assert from 'node:assert/strict';
import { KAZU_ITEMS, KAZU_CATEGORIES, kazuPool, kazuQuestion, kazuItem, numberReading } from '../shared/kazu.js';
import { getPronunciation } from '../shared/pronunciation.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const reading = id => kazuItem(id).reading;

test('readings keep the irregular forms a beginner must learn', () => {
  assert.deepEqual([300, 600, 800, 3000, 8000, 10000, 14, 40].map(numberReading), ['さんびゃく', 'ろっぴゃく', 'はっぴゃく', 'さんぜん', 'はっせん', 'いちまん', 'じゅうよん', 'よんじゅう']);
  assert.deepEqual(['time-0400', 'time-0700', 'time-0900', 'time-1001', 'time-1103', 'time-1206', 'time-0210', 'time-0508'].map(reading), ['よじ', 'しちじ', 'くじ', 'じゅうじいっぷん', 'じゅういちじさんぷん', 'じゅうにじろっぷん', 'にじじゅっぷん', 'ごじはっぷん']);
  assert.deepEqual(['date-1', 'date-4', 'date-8', 'date-14', 'date-20', 'date-24'].map(reading), ['ついたち', 'よっか', 'ようか', 'じゅうよっか', 'はつか', 'にじゅうよっか']);
  assert.deepEqual(['month-4', 'month-7', 'month-9', 'month-11'].map(reading), ['しがつ', 'しちがつ', 'くがつ', 'じゅういちがつ']);
  assert.deepEqual(['ctr-hon-1', 'ctr-hon-3', 'ctr-hon-6', 'ctr-hiki-3', 'ctr-nin-1', 'ctr-nin-2', 'ctr-nin-4', 'ctr-tsu-8'].map(reading), ['いっぽん', 'さんぼん', 'ろっぽん', 'さんびき', 'ひとり', 'ふたり', 'よにん', 'やっつ']);
  assert.deepEqual(kazuItem('time-0210').alt, ['にじじっぷん']);
});

test('every item is complete, unique and pronounceable with the taught reading', () => {
  assert.equal(new Set(KAZU_ITEMS.map(item => item.id)).size, KAZU_ITEMS.length);
  for (const item of KAZU_ITEMS) {
    assert.ok(item.jp && item.romaji && item.pt, item.id);
    assert.match(item.reading, /^[ぁ-ゖー\s]+$/u, `${item.id}: leitura só em hiragana`);
    assert.ok(!item.traps.includes(item.reading) && !item.traps.some(trap => item.alt.includes(trap)), `${item.id}: armadilha não pode ser leitura aceita`);
    assert.equal(getPronunciation(item.speak)?.spoken, item.reading, `${item.id}: a voz lê a leitura ensinada`);
  }
  for (const [category] of KAZU_CATEGORIES.filter(([id]) => id !== 'all')) assert.ok(kazuPool(category).length >= 10, category);
});

test('each question has four different choices and exactly one right answer', () => {
  for (const mode of ['read', 'meaning']) {
    for (const item of KAZU_ITEMS) {
      for (let seed = 1; seed <= 6; seed++) {
        const question = kazuQuestion(item, kazuPool(item.category), mode, seeded(seed * 31 + item.id.length));
        assert.equal(question.choices.length, 4, `${item.id} ${mode}`);
        assert.equal(new Set(question.choices.map(choice => choice.main)).size, 4, `${item.id} ${mode}: alternativas repetidas`);
        assert.equal(question.choices.filter(choice => choice.key === question.answer).length, 1);
        // Outras leituras aceitas (じっぷん, はちふん) nunca aparecem como alternativa errada.
        for (const choice of question.choices.filter(choice => choice.key !== question.answer)) assert.ok(!item.alt.includes(choice.main) && choice.main !== item.reading, `${item.id}: ${choice.main}`);
      }
    }
  }
});

test('counter questions from Portuguese only offer other counters, with つ only for people and animals', () => {
  for (const item of kazuPool('counters')) {
    for (let seed = 1; seed <= 8; seed++) {
      const others = kazuQuestion(item, kazuPool('counters'), 'meaning', seeded(seed)).choices.filter(choice => choice.key !== item.id).map(choice => kazuItem(choice.key));
      assert.ok(others.every(other => other.counter !== item.counter), item.id);
      if (!['nin', 'hiki'].includes(item.counter)) assert.ok(others.every(other => other.counter !== 'tsu'), `${item.id}: つ também serviria para objetos`);
    }
  }
});

test('pointing questions keep the same series, so only the distance decides', () => {
  for (const item of kazuPool('pointing')) {
    for (const mode of ['read', 'meaning']) {
      const question = kazuQuestion(item, kazuPool('pointing'), mode, seeded(5));
      assert.ok(question.choices.every(choice => kazuItem(choice.key).group === item.group), item.id);
    }
  }
});
