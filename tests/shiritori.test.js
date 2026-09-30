import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chainKana, startKana, endsInN, toHiragana, createDictionary, createShiritori } from '../shared/shiritori.js';

const data = JSON.parse(readFileSync(new URL('../frontend/assets/data/shiritori-words.json', import.meta.url), 'utf8'));
const dictionary = createDictionary(data.words);
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('chain rules handle long marks, small kana, katakana and ん', () => {
  assert.equal(chainKana('コーヒー'), 'ひ');
  assert.equal(chainKana('でんしゃ'), 'や');
  assert.equal(chainKana('ジュース'), 'す');
  assert.equal(chainKana('ちず'), 'ず');
  assert.equal(chainKana('はなぢ'), 'じ');
  assert.equal(startKana('ヒーロー'), 'ひ');
  assert.equal(toHiragana('ケーキ'), 'けーき');
  assert.ok(endsInN('パン'));
  assert.ok(!endsInN('りんご'));
});

test('the bundled word list is attributed, sizeable and only uses kana readings', () => {
  assert.match(data.source, /JMdict/);
  assert.equal(data.license, 'CC BY-SA 4.0');
  assert.ok(data.words.length > 10000);
  assert.ok(data.words.every(([reading]) => /^[ぁ-ゖァ-ヺー]+$/u.test(reading)));
});

test('lookup accepts kana, katakana written in hiragana, kanji and romaji, preferring Maru words', () => {
  const cat = dictionary.lookup('ねこ');
  assert.equal(cat.vocabId, 'word-cat');
  assert.equal(cat.pt, 'gato');
  assert.equal(dictionary.lookup('猫').key, 'ねこ');
  assert.equal(dictionary.lookup('neko').key, 'ねこ');
  assert.equal(dictionary.lookup(' コーヒー。').key, 'こーひー');
  assert.equal(dictionary.lookup('koohii').key, 'こーひー');
  assert.equal(dictionary.lookup('ringo').vocabId, 'word-apple');
  assert.equal(dictionary.lookup('ぬぬぬぬ'), null);
  assert.equal(dictionary.lookup(''), null);
});

test('invalid moves can be retried; ending in ん loses', () => {
  const game = createShiritori({ dictionary, random: seeded(3) });
  const first = game.start();
  assert.ok(first && !endsInN(first.key));
  assert.equal(game.play('ぬぬぬぬ').reason, 'unknown');
  const wrongStart = dictionary.words.find(word => startKana(word.key) !== game.required && !endsInN(word.key));
  assert.equal(game.play(wrongStart.reading).reason, 'start');
  assert.equal(game.play(first.reading).ok, false);
  assert.equal(game.phase, 'player');
  const losing = dictionary.words.find(word => startKana(word.key) === game.required && endsInN(word.key));
  const move = game.play(losing.reading);
  assert.equal(move.result.winner, 'bot');
  assert.equal(move.result.reason, 'n');
  assert.equal(move.result.chain, 0, 'a palavra perdedora não conta');
  assert.equal(game.phase, 'over');
});

test('the bot answers with the right kana, never repeats and never ends in ん', () => {
  for (const level of ['calm', 'sharp']) {
    const game = createShiritori({ dictionary, level, random: seeded(level === 'calm' ? 7 : 11) });
    game.start();
    for (let turn = 0; turn < 40 && game.phase === 'player'; turn++) {
      const hint = game.hint();
      assert.ok(hint, 'sempre existe uma dica disponível');
      const move = game.play(hint.reading);
      assert.ok(move.ok);
      if (move.reply) {
        assert.equal(startKana(move.reply.key), chainKana(hint.key));
        assert.ok(!endsInN(move.reply.key));
      }
    }
    const keys = game.history.map(word => word.key);
    assert.equal(new Set(keys).size, keys.length);
    if (level === 'calm') assert.equal(game.result?.reason, 'bot-stuck', 'o Maru tranquilo acaba cedendo');
  }
});

test('giving up and timeouts end the round once', () => {
  const game = createShiritori({ dictionary, random: seeded(5) });
  game.start();
  assert.equal(game.timeout().reason, 'time');
  assert.equal(game.giveUp(), null);
  assert.equal(game.play('ねこ').reason, 'over');
});
