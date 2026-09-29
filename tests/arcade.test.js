import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPool, acceptsAnswer, makeDeck, insights, reviewPrefix, personalBest } from '../shared/arcade.js';
import { normalizeSnapshot, mergeSnapshots, recordReview } from '../shared/progress.js';

test('picture scripts use conventional orthography and do not give away the prompt', () => {
  const hira = buildPool({game:'pictures',script:'hiragana'});
  assert.ok(hira.length >= 10);
  assert.ok(hira.every(item => item.prompt === '' && item.answers.every(answer => !/[ァ-ヺ一-龯]/u.test(answer))));
  const kata = buildPool({game:'pictures',script:'katakana'});
  assert.equal(kata.length, 3);
  assert.ok(kata.every(item => item.answers.every(answer => /^[ァ-ヺー]+$/u.test(answer))));
  const kanji = buildPool({game:'pictures',script:'kanji'});
  assert.ok(kanji.every(item => item.answers.every(answer => /^[一-龯々]+$/u.test(answer))));
  const water = kanji.find(item => item.id === 'word-water');
  assert.equal(acceptsAnswer(water, 'みず'), false);
  assert.equal(acceptsAnswer(water, '水'), true);
  assert.equal(buildPool({game:'pictures',script:'all'}).length, 14);
});
test('recognition offers distinct choices including the correct kana', () => {
  for (const item of buildPool({game:'difference',script:'kana'})) {
    assert.equal(new Set(item.choices).size,item.choices.length);
    assert.ok(item.choices.includes(item.answers[0]));
    assert.ok(item.choices.some(choice => !acceptsAnswer(item,choice)));
  }
});
test('transcription shows only Japanese and preserves the displayed spelling and particles', () => {
  for (const script of ['kana','all']) {
    const pool = buildPool({game:'sentences',script});
    assert.ok(pool.length >= 30);
    assert.equal(new Set(pool.map(item => item.id)).size,pool.length);
    assert.ok(pool.every(item => /^[ぁ-ゖァ-ヺ一-龯々ー。、]+$/u.test(item.prompt)));
    assert.ok(pool.every(item => acceptsAnswer(item,item.prompt)));
    assert.ok(pool.every(item => !acceptsAnswer(item,'Escrevo em português')));
    if (script === 'kana') assert.ok(pool.every(item => !/[一-龯]/u.test(item.prompt)));
  }
  const kana = buildPool({game:'sentences',script:'kana'}).find(item => item.id === 'water');
  const kanji = buildPool({game:'sentences',script:'all'}).find(item => item.id === 'water');
  assert.ok(acceptsAnswer(kana,'みず を のみます。'));
  assert.equal(acceptsAnswer(kana,'みずがのみます'),false);
  assert.equal(acceptsAnswer(kana,'mizu wo nomimasu'),false);
  assert.ok(acceptsAnswer(kanji,'水を飲みます'));
  assert.equal(acceptsAnswer(kanji,'みずをのみます'),false);
});
test('old repetition links open Japanese transcription', () => {
  for (const game of ['repeat']) assert.deepEqual(buildPool({game}),buildPool());
  assert.equal(reviewPrefix({game:'sentences',script:'all'}),'arcade:sentences:all:transcribe:');
});
test('infinite deck completes each catalogue cycle without immediate duplicates', () => {
  const pool = buildPool({game:'pictures',script:'all'});
  const next = makeDeck(pool,{},'',()=>0.4);
  for (let cycle=0;cycle<4;cycle++) {
    const seen = Array.from({length:pool.length},()=>next().id);
    assert.equal(new Set(seen).size,pool.length);
    for(let i=1;i<seen.length;i++) assert.notEqual(seen[i],seen[i-1]);
  }
});
test('insights wait for evidence; records and personal best survive normalization and merges', () => {
  const config = {game:'pictures',script:'all'};
  const prefix = reviewPrefix(config), pool = buildPool(config), snapshot=normalizeSnapshot();
  recordReview(snapshot,prefix+pool[0].id,true,100);
  recordReview(snapshot,prefix+pool[0].id,true,200);
  assert.equal(insights(pool,snapshot.reviews,prefix).strong.length,0);
  recordReview(snapshot,prefix+pool[0].id,true,300);
  for (let i=0;i<3;i++) recordReview(snapshot,prefix+pool[1].id,false,400+i);
  assert.equal(insights(pool,snapshot.reviews,prefix).strong.length,1);
  assert.equal(insights(pool,snapshot.reviews,prefix).weak.length,1);
  personalBest(snapshot,'pictures:60',500,100);
  const other=normalizeSnapshot(); personalBest(other,'pictures:60',100,200);
  const merged=mergeSnapshots(snapshot,other);
  assert.equal(merged.arcade['pictures:60'].score,500);
  assert.equal(merged.reviews[prefix+pool[0].id].attempts,3);
});


test('translation always asks Japanese to Portuguese, accepts accents and gender variants', () => {
  const pool = buildPool({game:'translate',script:'all',direction:'pt-ja'});
  assert.ok(pool.every(item => item.language === 'pt' && /[ぁ-ゖァ-ヺ一-龯]/u.test(item.prompt)));
  assert.ok(pool.every(item => acceptsAnswer(item,item.answers[0])));
  assert.ok(pool.every(item => !acceptsAnswer(item,item.prompt)));
  assert.ok(acceptsAnswer(pool.find(item => item.id === 'origin'),'Sou brasileira.'));
  assert.ok(acceptsAnswer(pool.find(item => item.id === 'water'),'Eu bebo agua!'));
  assert.equal(acceptsAnswer(pool.find(item => item.id === 'water'),'Não bebo água'),false);
  assert.equal(reviewPrefix({game:'translate',script:'all'}),'arcade:translate:all:ja-pt:');
});
