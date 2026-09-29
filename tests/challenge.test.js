import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeItems, createChallenge, challengeAdvice } from '../shared/challenge.js';
import { normalizeSnapshot, recordReview, mergeSnapshots } from '../shared/progress.js';

test('challenge families keep scripts separate and include N with WA', () => {
  assert.deepEqual(challengeItems().map(item=>item.answer), ['あ','い','う','え','お']);
  assert.deepEqual(challengeItems('katakana','ga').map(item=>item.answer), ['ガ','ギ','グ','ゲ','ゴ']);
  assert.deepEqual(challengeItems('hiragana','wa').map(item=>item.answer), ['わ','を','ん']);
  assert.deepEqual(challengeItems('listening'), challengeItems('hiragana'));
  for (const script of ['hiragana','katakana']) {
    const items=challengeItems(script,'all');
    assert.equal(items.length,71);
    assert.equal(new Set(items.map(item=>item.id)).size,71);
    assert.ok(items.every(item=>item.route.startsWith('writing/')));
  }
});

test('deadline takes priority over an answer and settles only once', () => {
  const game=createChallenge(challengeItems(),15);
  assert.equal(game.answer('あ',0),null);
  assert.equal(game.next(),false);
  assert.equal(game.start(1000),true);
  assert.equal(game.start(9000),false);
  assert.equal(game.remaining(15999),1);
  assert.equal(game.expire(15999),null);
  const result=game.answer('あ',16000);
  assert.equal(result.correct,false);
  assert.equal(result.timeout,true);
  assert.equal(game.answer('あ',16000),null);
  assert.equal(game.expire(90000),null);
  assert.equal(game.results.length,1);
  assert.equal(game.next(),true);
  assert.equal(game.next(),false);
  assert.equal(game.start(90000),true);
  assert.equal(game.remaining(90000),15000);
  assert.equal(game.answer('い',104999).correct,true);
});

test('an elapsed deadline stays expired after a background tab wakes', () => {
  const game=createChallenge(challengeItems('hiragana','ya'),30);
  game.start(0);
  assert.equal(game.remaining(180000),0);
  assert.equal(game.expire(180000).timeout,true);
  assert.equal(game.results.length,1);
});

test('untimed practice finishes a small family and enforces the requested script', () => {
  const items=challengeItems('hiragana','ya');
  const game=createChallenge(items,0);
  for (const item of items) {
    assert.equal(game.start(1),true);
    assert.equal(game.remaining(999999),null);
    assert.equal(game.expire(999999),null);
    assert.equal(game.answer(' '+item.answer+' ',999999).correct,true);
    game.next();
  }
  assert.equal(game.phase,'complete');
  assert.equal(game.start(1000000),false);
  assert.equal(game.results.length,3);
  for (const input of ['a','ア']) {
    const wrongScript=createChallenge(challengeItems(),0);
    wrongScript.start(0);
    assert.equal(wrongScript.answer(input,1).correct,false);
  }
  const katakana=createChallenge(challengeItems('katakana'),0);
  katakana.start(0);
  assert.equal(katakana.answer('ｱ',1).correct,true);
});

test('sentence challenges accept kana and romaji and reject incorrect particles', () => {
  for (const item of challengeItems('sentences')) {
    assert.doesNotMatch(item.answer,/\p{Script=Han}/u);
    for (const input of [item.answer,item.romaji]) {
      const game=createChallenge([item],30);
      game.start(0);
      assert.equal(game.answer(input,100).correct,true,item.id+' '+input);
    }
  }
  const identity=createChallenge(challengeItems('sentences'),0);
  identity.start(0);
  assert.equal(identity.answer('watashi o gakusei desu',10).correct,false);
});

test('study advice identifies missed models, including timeouts, without penalizing correct groups', () => {
  const [a,i]=challengeItems();
  const [ka]=challengeItems('hiragana','ka');
  const [ga]=challengeItems('hiragana','ga');
  const advice=challengeAdvice([
    {...a,correct:true,timeout:false}, {...i,correct:false,timeout:false},
    {...ka,correct:false,timeout:true}, {...ga,correct:true,timeout:false}
  ]);
  assert.equal(advice.length,2);
  assert.equal(advice[0].topic,ka.topic);
  assert.equal(advice[0].timeouts,1);
  assert.equal(advice[1].route,i.route);
  assert.deepEqual(advice[1].items,[{answer:'い',romaji:'i'}]);
  assert.deepEqual(challengeAdvice([{...a,correct:true,timeout:false}]),[]);
});

test('challenge answers use existing review records and survive progress merging', () => {
  const progress=normalizeSnapshot();
  const game=createChallenge(challengeItems(),15);
  game.start(1000);
  const result=game.expire(16000);
  recordReview(progress,result.id,result.correct,16000);
  const saved=mergeSnapshots(normalizeSnapshot(),JSON.parse(JSON.stringify(progress)));
  assert.equal(saved.kanaStats[result.id].wrong,1);
  assert.equal(saved.reviews[result.id].due,616000);
  assert.equal(saved.reviews[result.id].correct,0);
});
