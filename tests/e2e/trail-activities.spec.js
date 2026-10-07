import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { LESSONS, getModule } from '../../shared/curriculum.js';
import { CHECKPOINTS } from '../../shared/checkpoints.js';
import { FINAL_UNITS_ADDED_AT } from '../../shared/learningPath.js';
import { seedProgress, unlockTrail } from './unlock.js';

const addedUnits = ['likes', 'past', 'te-form'];
const addedLessons = LESSONS.filter(lesson => addedUnits.includes(lesson.moduleId));
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test.beforeEach(async ({ context, page }) => {
  await context.setExtraHTTPHeaders({ 'x-maru-user': 'e2e-' + randomUUID() });
  await page.route(/(ytimg\.com|youtube-nocookie\.com|youtube\.com)/, route => route.abort());
});

for (const lesson of addedLessons) {
  test(`new lesson ${lesson.id} teaches, checks answers and completes its game on mobile`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await unlockTrail(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/lesson/' + lesson.id);
    await expect(page.locator('.lesson-intro h2')).toHaveText(lesson.hook);
    for (let index = 0; index <= lesson.sections.length; index++) {
      expect(await fits(page)).toBe(true);
      await page.locator('[data-lesson="next"]').click();
    }
    for (const question of lesson.quiz) {
      expect(await fits(page)).toBe(true);
      await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
      await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
      await expect(page.locator('.feedback.success')).toContainText(question.explanation);
      await page.locator('[data-lesson="question-next"]').click();
    }
    await page.locator('[data-game="start"]').click();
    const readings = new Map(lesson.sections.flatMap(section => section.examples).map(example => [example.jp, example.romaji]));
    let rounds = 0;
    while (await page.locator('.karuta-card').count()) {
      const prompt = await page.locator('.lesson-game-prompt').textContent();
      await page.locator('.karuta-card').filter({ has: page.getByText(readings.get(prompt), { exact: true }) }).click();
      await expect(page.locator('.lesson-game .feedback.success')).toContainText('Pegou!');
      expect(await fits(page)).toBe(true);
      rounds++;
      await page.locator('[data-game="next"]').click();
    }
    expect(rounds).toBeGreaterThanOrEqual(3);
    await expect(page.locator('.lesson-game-result')).toContainText(`${rounds} de ${rounds}`);
    expect(await fits(page)).toBe(true);
    const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('maru-learning-v2')).lessons[id], lesson.id);
    expect(saved.completedAt).toBeGreaterThan(0);
    expect(saved.score).toBe(lesson.quiz.length);
    expect(errors).toEqual([]);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  for (const unitId of addedUnits) {
    test(`${unitId} lists activities and its checkpoint unlocks the next unit at width ${viewport.width}`, async ({ page }) => {
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const unit = getModule(unitId);
      await seedProgress(page, { placement: { acceptedModule: unitId, updatedAt: 1 }, lessons: unitId === 'te-form' ? Object.fromEntries(unit.lessons.map(lesson => [lesson.id, { completedAt: 10, score: lesson.quiz.length }])) : {} });
      await page.setViewportSize(viewport);
      await page.goto('/#/journey/' + unitId);
      const station = page.locator('#unidade-' + unitId);
      await expect(station.locator('a.lesson-row[href^="#/lesson/"]')).toHaveCount(unit.lessons.length);
      await expect(station.locator(`a[href="#/checkpoint/${unitId}"]`)).toHaveCount(1);
      await expect(station).not.toContainText('Em breve');
      expect(await fits(page)).toBe(true);
      await station.locator(`a[href="#/checkpoint/${unitId}"]`).click();
      await page.locator('[data-checkpoint="start"]').click();
      const sources = CHECKPOINTS[unitId].items.map(item => unit.lessons.find(lesson => lesson.id === item.lessonId).quiz[item.index]);
      for (let index = 0; index < sources.length; index++) {
        const prompt = await page.locator('.placement-question').textContent();
        const source = sources.find(question => question.prompt === prompt);
        expect(source, prompt).toBeTruthy();
        await page.locator('#checkpoint-answer .answer-option').filter({ has: page.getByText(source.choices[source.answer], { exact: true }) }).locator('input').check();
        await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
        await expect(page.locator('.feedback.success')).toContainText('Isso mesmo!');
        expect(await fits(page)).toBe(true);
        await page.locator('[data-checkpoint="next"]').click();
      }
      await expect(page.locator('.checkpoint-result h1')).toHaveText('Checkpoint aprovado!');
      if (unitId === 'te-form') {
        await expect(page.locator('.checkpoint-result')).toContainText('Você concluiu o último checkpoint da trilha principal.');
        await expect(page.getByRole('link', { name: 'Voltar à trilha', exact: true })).toHaveAttribute('href', '#/journey');
      }
      const passed = await page.evaluate(id => JSON.parse(localStorage.getItem('maru-learning-v2')).checkpoints[id].passedAt, unitId);
      expect(passed).toBeGreaterThan(0);
      await page.reload();
      await expect(page.locator('.checkpoint-intro')).toContainText('Aprovado');
      const next = { likes: 'past', past: 'counting' }[unitId];
      if (next) {
        await page.goto('/#/journey/' + next);
        await expect(page.locator(`#unidade-${next} a.lesson-row[href^="#/lesson/"]`).first()).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }
}

test('existing counting progress keeps the new units and saved achievements available', async ({ page }) => {
  await seedProgress(page, { lessons: { 'num-counters': { completedAt: 10, score: 3 } }, checkpoints: { counting: { passedAt: 20, best: 100, attempts: 1 } }, xp: { total: 150 } });
  await page.goto('/#/journey/counting');
  await expect(page.locator('#unidade-counting .trail-stop.is-done a[href="#/lesson/num-counters"]')).toBeVisible();
  for (const unitId of addedUnits) {
    await page.goto('/#/journey/' + unitId);
    await expect(page.locator(`#unidade-${unitId} a.lesson-row[href^="#/lesson/"]`)).toHaveCount(getModule(unitId).lessons.length);
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')));
  expect(saved.xp.total).toBe(150);
  expect(saved.lessons['num-counters'].completedAt).toBe(10);
  expect(saved.checkpoints.counting.passedAt).toBe(20);
  expect(saved.checkpoints.likes).toBeUndefined();
  expect(saved.checkpoints.past).toBeUndefined();
});

for (const legacy of [true, false]) {
  test(`description checkpoint ${legacy ? 'before' : 'after'} expansion preserves the correct access`, async ({ page }) => {
    await seedProgress(page, { checkpoints: { describe: { passedAt: FINAL_UNITS_ADDED_AT + (legacy ? -1 : 1), best: 100, attempts: 1 } } });
    await page.goto('/#/journey/counting');
    const lesson = page.locator('#unidade-counting a[href="#/lesson/num-counters"]');
    await expect(lesson).toHaveCount(legacy ? 1 : 0);
    await page.goto('/#/lesson/num-counters');
    if (legacy) await expect(page.locator('.lesson-intro')).toBeVisible();
    else await expect(page.locator('.trail-locked')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')));
    expect(saved.lessons['num-counters']).toBeUndefined();
    expect(saved.checkpoints.likes).toBeUndefined();
    expect(saved.checkpoints.past).toBeUndefined();
  });
}
