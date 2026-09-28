import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOK_MODULES, BOOK_LESSONS, BOOK_KANJI, bookKanaText } from '../frontend/assets/js/features/book-content.js';
import { MODULES, LESSONS } from '../shared/curriculum.js';

test('printed progression postpones kanji and limits the appendix to ten basic characters', () => {
  assert.equal(BOOK_MODULES.length, 7);
  assert.ok(BOOK_MODULES.every(module => module.id !== 'kanji'));
  assert.deepEqual(BOOK_MODULES.map(module => module.number), ['01','02','03','04','05','06','07']);
  assert.equal(BOOK_KANJI.map(item => item.char).join(''), '一二三人日月山川木水');
  assert.ok(MODULES.some(module => module.id === 'kanji'));
  assert.ok(LESSONS.find(lesson => lesson.id === 'welcome').sections[1].examples.some(example => example.jp === '山'));
  assert.ok(!BOOK_LESSONS.find(lesson => lesson.id === 'welcome').sections[1].examples.some(example => example.jp === '山'));
});

test('kana conversion uses contextual readings in prose, choices and explanations', () => {
  assert.equal(bookKanaText('日本へ行きます。'), 'にほんへいきます。');
  assert.equal(bookKanaText('三百円・九時・四時・今日'), 'さんびゃくえん・くじ・よじ・きょう');
  assert.equal(bookKanaText('Complete: だれ＿来ますか'), 'Complete: だれ＿きますか');
  assert.equal(bookKanaText('好き é preferência. 水を飲みます。'), 'すき é preferência. みずをのみます。');
  for (const lesson of BOOK_LESSONS) {
    for (const section of lesson.sections) {
      for (const text of [section.title, section.body, section.tip]) assert.doesNotMatch(bookKanaText(text || ''), /[\p{Script=Han}々]/u, lesson.id);
      for (const example of section.examples) {
        assert.equal(bookKanaText(example.jp), example.reading || example.jp, `${lesson.id}: ${example.jp}`);
        assert.doesNotMatch(bookKanaText(example.note), /[\p{Script=Han}々]/u, lesson.id);
      }
    }
    for (const question of lesson.quiz) {
      const choices = question.choices.map(bookKanaText);
      assert.equal(new Set(choices).size, choices.length, lesson.id);
      for (const text of [question.prompt, question.explanation, ...choices]) assert.doesNotMatch(bookKanaText(text), /[\p{Script=Han}々]/u, lesson.id);
    }
  }
});
