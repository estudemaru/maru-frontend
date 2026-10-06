import { test, expect } from '@playwright/test';
import { KAZU_ITEMS } from '../../shared/kazu.js';
import { getLesson } from '../../shared/curriculum.js';

const snapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')));
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
// No modo "ver e ler", a pergunta mostra a escrita; a resposta é a leitura do item.
const current = async (page, category) => {
  const prompt = (await page.locator('.renda-prompt > span').textContent()).trim();
  return KAZU_ITEMS.find(item => item.category === category && item.jp === prompt);
};

test('the numbers game asks for readings, explains mistakes and records reviews', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/practice');
  await expect(page.locator('.play-card')).toHaveCount(8);
  await page.locator('.play-card[href="#/arcade/kazu"]').click();
  await expect(page.locator('main h1')).toHaveText('Quanto, quando, qual');
  await page.locator('#kazu-category').selectOption('time');
  await page.locator('.play-start').click();

  const right = await current(page, 'time');
  await page.locator('.renda-choice', { has: page.locator('.renda-choice-main', { hasText: new RegExp(`^${right.reading}$`) }) }).click();
  await expect(page.locator('.renda-hit')).toContainText('Isso!');

  // O acerto avança sozinho: espera a próxima rodada antes de ler a pergunta.
  await expect(page.locator('.renda-hit')).toHaveCount(0);
  await expect(page.locator('.renda-choice:not([disabled])')).toHaveCount(4);
  const wrong = await current(page, 'time');
  await page.locator('.renda-choice', { hasNot: page.locator('.renda-choice-main', { hasText: new RegExp(`^${wrong.reading}$`) }) }).first().click();
  await expect(page.locator('.renda-answer')).toContainText(wrong.reading);
  await expect(page.locator('.renda-hint')).toContainText(wrong.pt);
  await expect(page.locator('.renda-answer [data-speak]')).toHaveAttribute('data-speak', wrong.speak);
  await expect(page.locator('#kazu-next')).toBeFocused();

  const reviews = (await snapshot(page)).reviews;
  expect(reviews[`arcade:kazu:time:read:${right.id}`].correct).toBe(1);
  expect(reviews[`arcade:kazu:time:read:${wrong.id}`].correct).toBe(0);
  await page.locator('#kazu-finish').click();
  await expect(page.locator('.renda-review')).toContainText(wrong.reading);
  expect(errors).toEqual([]);
});

test('the new trail stage leads from a lesson to the game in the same category', async ({ page }) => {
  await page.goto('/#/journey');
  await expect(page.locator('.trail-map-stop')).toHaveCount(9);
  await expect(page.locator('#etapa-numbers .trail-stop')).toHaveCount(6);
  const lesson = getLesson('num-week');
  await page.goto('/#/lesson/num-week');
  for (let i = 0; i <= lesson.sections.length; i++) await page.locator('[data-lesson="next"]').click();
  for (const question of lesson.quiz) {
    await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
    await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
    await page.locator('[data-lesson="question-next"]').click();
  }
  await page.getByRole('button', { name: 'Pular o jogo' }).click();
  await page.locator('[data-lesson="practice"]').click();
  await expect(page).toHaveURL(/#\/arcade\/kazu$/);
  await expect(page.locator('#kazu-category')).toHaveValue('week');
  await expect(page.locator('.renda-from')).toContainText('Dias da semana');
});

test('long readings and Portuguese prompts fit a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/#/arcade/kazu');
  for (const [category, mode] of [['numbers', 'read'], ['time', 'read'], ['pointing', 'meaning'], ['counters', 'meaning']]) {
    await page.locator('#kazu-category').selectOption(category);
    await page.locator('#kazu-mode').selectOption(mode);
    await page.locator('.play-start').click();
    for (let round = 0; round < 4; round++) {
      await expect(page.locator('.renda-choice')).toHaveCount(4);
      expect(await fits(page)).toBe(true);
      expect(await page.locator('.renda-choice-main').evaluateAll(items => items.every(item => item.scrollWidth <= item.clientWidth + 1))).toBe(true);
      await page.locator('.renda-choice').first().click();
      if (await page.locator('#kazu-next').isVisible()) await page.locator('#kazu-next').click();
      else await page.waitForTimeout(500);
    }
    await page.locator('#kazu-finish').click();
    await page.locator('#kazu-configure').click();
  }
});
