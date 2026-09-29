import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_POOL, dailyWord, dailySteps, checkWrite, recordDaily, dailyStreak, dayNumber } from '../shared/daily.js';
import { normalizeSnapshot, mergeSnapshots } from '../shared/progress.js';

const days = (start, total) => Array.from({ length: total }, (_, i) => new Date(Date.UTC(2026, 0, start + i)).toISOString().slice(0, 10));

test('the word of the day depends only on the date and covers the pool before repeating', () => {
  assert.equal(dailyWord('2026-09-29').id, dailyWord('2026-09-29').id);
  assert.equal(dayNumber('2026-03-29') - dayNumber('2026-03-28'), 1, 'horário de verão não pula dias');
  const cycle = days(1, DAILY_POOL.length).map(day => dailyWord(day).id);
  assert.equal(new Set(cycle).size, DAILY_POOL.length);
  assert.equal(dailyWord(days(1, DAILY_POOL.length + 1).at(-1)).id, cycle[0]);
});

test('each day has three solvable steps built around the same word', () => {
  for (const day of days(1, 120)) {
    const word = dailyWord(day);
    const [meaning, write, use] = dailySteps(day);
    assert.deepEqual(dailySteps(day), [meaning, write, use], 'as alternativas também são fixas no dia');
    assert.equal(meaning.choices.length, 4); assert.equal(new Set(meaning.choices).size, 4); assert.ok(meaning.choices.includes(word.pt));
    assert.ok(checkWrite(write, word.reading) && checkWrite(write, word.jp));
    assert.equal(use.before + use.answer + use.after, word.sentence);
    assert.equal(new Set(use.choices).size, 3); assert.ok(use.choices.includes(word.jp));
  }
});

test('writing accepts katakana typed in hiragana, never an empty or romaji answer', () => {
  const step = { answers: ['コーヒー'] };
  assert.ok(checkWrite(step, 'こーひー'));
  assert.ok(checkWrite(step, ' コーヒー。'));
  assert.ok(!checkWrite(step, 'koohii'));
  assert.ok(!checkWrite(step, ''));
});

test('only the first result of a day is recorded and it earns XP once', () => {
  const snapshot = normalizeSnapshot();
  assert.ok(recordDaily(snapshot, '2026-09-29', 2, 1000));
  assert.ok(!recordDaily(snapshot, '2026-09-29', 3, 2000));
  assert.deepEqual(snapshot.daily['2026-09-29'], { word: dailyWord('2026-09-29').id, score: 2, completedAt: 1000 });
  assert.equal(snapshot.xp.total, 20);
  assert.ok(!recordDaily(snapshot, 'ontem', 3));
});

test('daily results survive normalization and merge keeps the first completion', () => {
  const clean = normalizeSnapshot({ daily: { '2026-09-29': { word: 'word-cat', score: 9, completedAt: 5 }, '2026-09-30': 'x', nope: {} } });
  assert.deepEqual(clean.daily, { '2026-09-29': { word: 'word-cat', score: 3, completedAt: 5 } });
  assert.deepEqual(normalizeSnapshot({}).daily, {});
  const phone = { updatedAt: 50, daily: { '2026-09-28': { word: 'a', score: 1, completedAt: 10 }, '2026-09-29': { word: 'b', score: 3, completedAt: 40 } } };
  const laptop = { updatedAt: 60, daily: { '2026-09-29': { word: 'b', score: 1, completedAt: 30 }, '2026-09-30': { word: 'c', score: 0, completedAt: 0 } } };
  const merged = mergeSnapshots(phone, laptop);
  assert.equal(merged.daily['2026-09-28'].score, 1);
  assert.equal(merged.daily['2026-09-29'].completedAt, 30);
  assert.deepEqual(mergeSnapshots(laptop, phone).daily, merged.daily);
  assert.equal(merged.daily['2026-09-30'].completedAt, 0);
});

test('the daily streak counts consecutive completed days', () => {
  const snapshot = normalizeSnapshot({ daily: { '2026-09-26': { completedAt: 1 }, '2026-09-27': { completedAt: 1 }, '2026-09-28': { completedAt: 1 } } });
  assert.equal(dailyStreak(snapshot, '2026-09-29'), 3, 'hoje ainda está aberto');
  assert.equal(dailyStreak(snapshot, '2026-09-30'), 0);
  recordDaily(snapshot, '2026-09-29', 1);
  assert.equal(dailyStreak(snapshot, '2026-09-29'), 4);
});
