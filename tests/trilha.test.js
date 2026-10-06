import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULES, UNITS, LESSONS, THEMES, getLesson, hasCheckpoint } from '../shared/curriculum.js';
import { CHECKPOINTS, checkpointQuestions, gradeCheckpoint } from '../shared/checkpoints.js';
import { unitStates, nextStep, stepAfter, isLessonOpen, moduleSeals } from '../shared/learningPath.js';
import { normalizeSnapshot, mergeSnapshots, recordCheckpoint } from '../shared/progress.js';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const unitIndex = id => UNITS.findIndex(unit => unit.id === id);
const open = snapshot => unitStates(snapshot).filter(unit => unit.open).map(unit => unit.id);
const finish = (snapshot, unitId) => getUnit(unitId).lessons.forEach(lesson => { snapshot.lessons[lesson.id] = { completedAt: 1, score: 3 }; });
const pass = (snapshot, unitId) => { snapshot.checkpoints[unitId] = { passedAt: 1, best: 100, attempts: 1, updatedAt: 1 }; };
const getUnit = id => UNITS.find(unit => unit.id === id);

test('the trail has units 0 to 14 in order, extras apart, and every lesson exactly once', () => {
  assert.deepEqual(UNITS.map(unit => unit.number), Array.from({ length: 15 }, (_, i) => String(i)));
  assert.deepEqual(MODULES.filter(module => module.extra).map(module => module.id), ['curious', 'kanji', 'casual']);
  const ids = MODULES.flatMap(module => module.lessons.map(lesson => lesson.id));
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(ids.length, THEMES.flatMap(theme => theme.lessons).length);
  assert.ok(LESSONS.every(lesson => lesson.theme && THEMES.some(theme => theme.id === lesson.theme)));
  // As lições de "Quanto, quando e qual" foram distribuídas, sem etapa própria.
  assert.deepEqual(['num-pointing', 'num-count', 'num-time', 'num-week', 'num-dates', 'num-counters'].map(id => getLesson(id).moduleId), ['around', 'numbers', 'time', 'time', 'time', 'counting']);
  assert.deepEqual(['likes', 'past', 'te-form'].map(id => getUnit(id).lessons.length), [0, 0, 0]);
});

test('checkpoints only ask what their own unit (or an earlier one) taught', () => {
  for (const [unitId, checkpoint] of Object.entries(CHECKPOINTS)) {
    assert.ok(unitIndex(unitId) > 0, `${unitId}: a unidade 0 não tem checkpoint`);
    for (const item of checkpoint.items) {
      assert.ok(checkpoint.concepts[item.concept], `${unitId}: conceito ${item.concept}`);
      const lesson = getLesson(item.lessonId);
      assert.ok(lesson && unitIndex(lesson.moduleId) <= unitIndex(unitId), `${unitId}: ${item.lessonId} vem de uma unidade posterior`);
      if (item.type === 'quiz') assert.ok(lesson.quiz[item.index], `${unitId}: ${item.lessonId}#${item.index}`);
    }
    const questions = checkpointQuestions(unitId, seeded(7));
    assert.ok(questions.length >= 6, `${unitId}: com menos de 6 perguntas, um erro já reprova`);
    assert.equal(new Set(questions.map(question => question.key)).size, questions.length, `${unitId}: pergunta repetida`);
    for (const concept of Object.keys(checkpoint.concepts)) assert.ok(questions.some(question => question.concept === concept), `${unitId}: ${concept} sem pergunta`);
    // Um conceito crítico tem ao menos duas perguntas: um deslize só não reprova.
    for (const concept of checkpoint.critical) assert.ok(questions.filter(question => question.concept === concept).length >= 2, `${unitId}: ${concept}`);
    for (let seed = 1; seed <= 5; seed++) {
      for (const question of checkpointQuestions(unitId, seeded(seed))) {
        assert.ok(question.choices[question.answer], `${unitId}: ${question.key}`);
        assert.equal(new Set(question.choices).size, question.choices.length, `${unitId}: ${question.key} repete alternativa`);
      }
    }
  }
  // A trilha decide quem tem checkpoint sem carregar as perguntas: as duas listas precisam bater.
  assert.deepEqual(UNITS.filter(hasCheckpoint).map(unit => unit.id), Object.keys(CHECKPOINTS));
  assert.equal(hasCheckpoint(UNITS[0]), false);
});

test('passing needs 80% and no critical concept fully missed', () => {
  const questions = checkpointQuestions('meet', seeded(3));
  const right = questions.map(question => question.answer);
  const wrong = index => (questions[index].answer + 1) % questions[index].choices.length;
  assert.equal(gradeCheckpoint('meet', questions, right).passed, true);
  // Dois erros em 12 (83%) passam; três (75%) não. Os erros caem em cumprimentos (3 perguntas).
  const greetings = questions.map((item, i) => item.concept === 'greetings' ? i : -1).filter(i => i >= 0);
  const missing = indexes => right.map((answer, i) => indexes.includes(i) ? wrong(i) : answer);
  assert.deepEqual(['percent', 'passed'].map(key => gradeCheckpoint('meet', questions, missing(greetings.slice(0, 2)))[key]), [83, true]);
  assert.deepEqual(['percent', 'passed'].map(key => gradeCheckpoint('meet', questions, missing(greetings))[key]), [75, false]);
  // As duas perguntas de か erradas: 83%, mas か é crítico para a unidade seguinte.
  const question = right.map((answer, i) => questions[i].concept === 'question' ? wrong(i) : answer);
  const missedQuestion = gradeCheckpoint('meet', questions, question);
  assert.equal(missedQuestion.percent, 83);
  assert.deepEqual([missedQuestion.passed, missedQuestion.missedCritical], [false, ['question']]);
  // Um conceito comum zerado passa, com o aviso de revisar.
  const no = gradeCheckpoint('meet', questions, right.map((answer, i) => questions[i].concept === 'no' ? wrong(i) : answer));
  assert.deepEqual([no.passed, no.missedConcepts], [true, ['no']]);
});

test('a new learner opens one unit at a time', () => {
  const p = normalizeSnapshot();
  assert.deepEqual(p.checkpoints, {});
  assert.deepEqual(open(p), ['start']);
  assert.equal(nextStep(p).lesson.id, 'welcome');
  assert.equal(isLessonOpen(p, 'h-vowels'), false);
  assert.equal(isLessonOpen(p, 'casual-slang'), true, 'extras ficam abertos');
  finish(p, 'start');
  assert.deepEqual(open(p), ['start', 'hiragana']);
  finish(p, 'hiragana');
  // Aulas lidas, checkpoint pendente: a próxima parada é o checkpoint, e a unidade 2 segue fechada.
  assert.deepEqual(nextStep(p), { kind: 'checkpoint', unit: unitStates(p).find(unit => unit.id === 'hiragana') });
  assert.deepEqual(stepAfter(p, 'h-rest').kind, 'checkpoint');
  assert.equal(stepAfter(p, 'h-vowels').lesson.id, 'h-ka');
  assert.equal(isLessonOpen(p, 'h-dakuten'), false);
  // Reprovar não abre nada nem apaga nada.
  recordCheckpoint(p, 'hiragana', { percent: 58, passed: false }, 100);
  assert.deepEqual(p.checkpoints.hiragana, { passedAt: 0, best: 58, attempts: 1, updatedAt: 100 });
  assert.equal(isLessonOpen(p, 'h-dakuten'), false);
  assert.equal(recordCheckpoint(p, 'hiragana', { percent: 92, passed: true }, 200), true);
  assert.equal(recordCheckpoint(p, 'hiragana', { percent: 75, passed: false }, 300), false);
  assert.deepEqual(p.checkpoints.hiragana, { passedAt: 200, best: 92, attempts: 3, updatedAt: 300 });
  assert.equal(isLessonOpen(p, 'h-dakuten'), true);
  assert.equal(nextStep(p).lesson.id, 'h-dakuten');
});

test('units without lessons yet let the trail pass through', () => {
  const p = normalizeSnapshot({ placement: { acceptedModule: 'describe', updatedAt: 1 } });
  finish(p, 'describe');
  assert.equal(nextStep(p).kind, 'checkpoint');
  pass(p, 'describe');
  // 11 e 12 ainda não têm aulas: a próxima parada é a unidade 13.
  assert.ok(['likes', 'past', 'counting'].every(id => open(p).includes(id)));
  assert.equal(nextStep(p).lesson.id, 'num-counters');
  finish(p, 'counting'); pass(p, 'counting');
  assert.equal(nextStep(p), null);
});

test('the diagnosis opens whole units, never scattered lessons', () => {
  const p = normalizeSnapshot({ placement: { acceptedModule: 'numbers', updatedAt: 1 } });
  const states = unitStates(p);
  assert.deepEqual(states.filter(unit => unit.cleared).map(unit => unit.id), ['start', 'hiragana', 'hiragana-plus', 'meet', 'around', 'world']);
  assert.deepEqual(open(p), ['start', 'hiragana', 'hiragana-plus', 'meet', 'around', 'world', 'numbers']);
  assert.equal(nextStep(p).lesson.id, 'kanji-numbers');
  assert.deepEqual(p.checkpoints, {}, 'o diagnóstico não inventa checkpoints');
  assert.equal(moduleSeals(p).filter(seal => seal.earned).length, 0, 'nem selos');
});

test('old progress keeps everything it had and is only read in the new shape', () => {
  // Antes das unidades: diagnóstico na etapa "sentences" e uma aula da unidade 10 concluída.
  const old = { lessons: { welcome: { completedAt: 5, score: 3 }, 'sentence-describe': { completedAt: 6, score: 3 } }, placement: { version: 1, acceptedModule: 'sentences', updatedAt: 9 }, xp: { total: 60 } };
  const p = normalizeSnapshot(old);
  assert.deepEqual(p.lessons, old.lessons);
  assert.equal(p.xp.total, 60);
  assert.equal(p.placement.acceptedModule, 'meet');
  assert.deepEqual(p.checkpoints, {});
  assert.ok(open(p).includes('describe'), 'a unidade com aula concluída continua aberta');
  assert.equal(isLessonOpen(p, 'sentence-describe'), true);
  assert.equal(isLessonOpen(p, 'sentence-actions'), false, 'a unidade 9 espera o checkpoint da 8');
  assert.equal(nextStep(p).lesson.id, 'greetings');
  // Normalizar de novo não muda nada.
  assert.deepEqual(normalizeSnapshot(p), p);
  for (const [legacy, unit] of Object.entries({ start: 'start', hiragana: 'hiragana', katakana: 'meet', kanji: 'meet', particles: 'meet', everyday: 'numbers', casual: 'numbers', numbers: 'numbers', nonsense: '' })) {
    assert.equal(normalizeSnapshot({ placement: { acceptedModule: legacy } }).placement.acceptedModule, unit, legacy);
  }
});

test('checkpoints survive bad data, merges and older apps', () => {
  const p = normalizeSnapshot({ checkpoints: { meet: { passedAt: 'x', best: 250, attempts: -3 }, 'future-unit': { passedAt: 7, best: 90, attempts: 1, updatedAt: 7 }, __proto__: { passedAt: 1 }, 'Bad Key': {} } });
  assert.deepEqual(p.checkpoints, { meet: { passedAt: 0, best: 100, attempts: 0, updatedAt: 0 }, 'future-unit': { passedAt: 7, best: 90, attempts: 1, updatedAt: 7 } });
  const phone = normalizeSnapshot({ updatedAt: 10, checkpoints: { meet: { passedAt: 300, best: 85, attempts: 2, updatedAt: 300 } } });
  const laptop = normalizeSnapshot({ updatedAt: 20, checkpoints: { meet: { passedAt: 200, best: 80, attempts: 4, updatedAt: 250 }, around: { passedAt: 0, best: 50, attempts: 1, updatedAt: 260 } } });
  const merged = mergeSnapshots(phone, laptop);
  assert.deepEqual(merged.checkpoints.meet, { passedAt: 200, best: 85, attempts: 4, updatedAt: 300 });
  assert.deepEqual(merged.checkpoints.around, { passedAt: 0, best: 50, attempts: 1, updatedAt: 260 });
  // Uma aba com o app antigo manda o mesmo diagnóstico sem a unidade: fica o que tem unidade.
  const current = normalizeSnapshot({ placement: { acceptedModule: 'numbers', updatedAt: 50 } });
  const stale = normalizeSnapshot({ placement: { acceptedModule: '', updatedAt: 50 } });
  assert.equal(mergeSnapshots(stale, current).placement.acceptedModule, 'numbers');
  assert.equal(mergeSnapshots(current, stale).placement.acceptedModule, 'numbers');
});
