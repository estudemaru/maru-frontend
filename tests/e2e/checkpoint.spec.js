import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { CHECKPOINTS } from '../../shared/checkpoints.js';
import { getLesson, getModule } from '../../shared/curriculum.js';
import { seedProgress } from './unlock.js';

const snapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')));
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// As perguntas do checkpoint do hiragana vêm das lições, com o texto exato da resposta certa.
const answers = new Map(CHECKPOINTS.hiragana.items.map(item => {
  const question = getLesson(item.lessonId).quiz[item.index];
  return [question.prompt, question.choices[question.answer]];
}));

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ 'x-maru-user': 'e2e-' + randomUUID() });
});

async function answerAll(page, right) {
  for (let i = 0; i < answers.size; i++) {
    const answer = answers.get((await page.locator('.quiz-stage h2').textContent()).trim());
    const text = page.getByText(answer, { exact: true });
    await page.locator('.answer-option', right ? { has: text } : { hasNot: text }).first().click();
    await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
    await page.locator('[data-checkpoint="next"]').click();
  }
}

test('a checkpoint can fail without losing anything, then pass and open the next unit', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const read = ['start', 'hiragana'].flatMap(id => getModule(id).lessons.map(lesson => lesson.id));
  await seedProgress(page, { lessons: Object.fromEntries(read.map(id => [id, { completedAt: 1, score: 3 }])) });
  await page.goto('/#/journey');
  await expect(page.locator('.trail-next h2')).toHaveText('Checkpoint: Hiragana');
  await expect(page.locator('#unidade-hiragana-plus')).toHaveClass(/is-locked/);
  await page.locator('.trail-next .btn-primary').click();
  await expect(page).toHaveURL(/#\/checkpoint\/hiragana$/);

  await page.locator('[data-checkpoint="start"]').click();
  await answerAll(page, false);
  await expect(page.locator('.checkpoint-result h1')).toHaveText('Ainda não foi desta vez.');
  await expect(page.locator('.checkpoint-note.is-critical')).toContainText('as letras do hiragana');
  await expect(page.locator('.checkpoint-note.is-critical a')).toHaveAttribute('href', /#\/lesson\/h-/);
  let saved = await snapshot(page);
  expect(saved.checkpoints.hiragana).toMatchObject({ passedAt: 0, best: 0, attempts: 1 });
  expect(Object.keys(saved.lessons)).toHaveLength(read.length);
  await page.goto('/#/lesson/h-dakuten');
  await expect(page.locator('.trail-locked')).toContainText('checkpoint da Unidade 1');

  await page.goto('/#/checkpoint/hiragana');
  await expect(page.locator('.checkpoint-intro')).toContainText('Melhor nota até agora: 0%');
  await page.locator('[data-checkpoint="start"]').click();
  await answerAll(page, true);
  await expect(page.locator('.checkpoint-result h1')).toHaveText('Checkpoint aprovado!');
  await expect(page.locator('.checkpoint-result')).toContainText('+50 XP');
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await fits(page)).toBe(true);
  await page.getByRole('link', { name: 'Seguir para a próxima parada' }).click();
  await expect(page).toHaveURL(/#\/lesson\/h-dakuten$/);
  await expect(page.locator('.lesson-reader')).toBeVisible();
  saved = await snapshot(page);
  expect(saved.checkpoints.hiragana.passedAt).toBeGreaterThan(0);
  expect(saved.checkpoints.hiragana).toMatchObject({ best: 100, attempts: 2 });
  expect(saved.xp.total).toBe(55);
  expect(errors).toEqual([]);
});
