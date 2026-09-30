import { test, expect } from '@playwright/test';
import { dailySteps, dailyWord } from '../../shared/daily.js';

const snapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')));

test('the daily challenge runs three steps, records only the first result and resets the next day', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date(2026, 8, 30, 10) });
  const day = '2026-09-30', word = dailyWord(day), [meaning, write, use] = dailySteps(day);
  await page.goto('/#/home');
  await expect(page.locator('.play-daily')).toContainText('Uma palavra, três passos.');
  await expect(page.locator('.play-daily')).not.toContainText(word.pt);
  await page.locator('.play-daily').click();

  await expect(page.locator('.play-question .play-prompt')).toHaveText(meaning.prompt);
  await page.locator('.daily-choice', { hasText: meaning.answer }).click();
  await expect(page.locator('#daily-feedback')).toContainText('Isso!');
  await page.locator('#daily-next').click();

  await page.locator('#daily-hint').click();
  await expect(page.locator('.daily-reading')).toContainText(write.hint);
  await page.locator('#daily-answer').fill(word.reading);
  await page.locator('#daily-answer').press('Enter');
  await expect(page.locator('#daily-feedback')).toContainText('com ajuda da dica');
  await page.locator('#daily-next').click();

  await expect(page.locator('.daily-blank')).toContainText('＿＿');
  await page.locator('.daily-choice', { hasText: use.choices.find(choice => choice !== use.answer) }).click();
  await expect(page.locator('#daily-feedback')).toContainText('Guarde esta');
  await expect(page.locator('.daily-gap')).toHaveText(use.answer);
  await page.locator('#daily-next').click();

  await expect(page.locator('.play-result-hero h1')).toHaveText('1 de 3. Amanhã tem mais.');
  expect((await snapshot(page)).daily[day]).toMatchObject({ word: word.id, score: 1 });

  await page.locator('#daily-practice').click();
  for (const step of [meaning, write, use]) {
    if (step.kind === 'write') { await page.locator('#daily-answer').fill(word.jp); await page.locator('#daily-answer').press('Enter'); }
    else await page.locator('.daily-choice', { hasText: step.answer }).first().click();
    await page.locator('#daily-next').click();
  }
  await expect(page.locator('.play-result-hero')).toContainText('TREINO LIVRE');
  expect((await snapshot(page)).daily[day].score).toBe(1);

  await page.goto('/#/practice');
  await expect(page.locator('.play-daily')).toContainText('Feito!');
  await page.reload();
  await expect(page.locator('.play-daily .daily-stars')).toHaveAttribute('aria-label', '1 de 3 passos certos');
  await page.clock.setSystemTime(new Date(2026, 9, 1, 9));
  await page.goto('/#/home');
  await expect(page.locator('.play-daily')).toContainText('Uma palavra, três passos.');
  await expect(page.locator('.play-daily')).toContainText('1 dia seguido');
  expect(errors).toEqual([]);
});

test('the daily challenge fits small phones', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/#/daily');
  await expect(page.locator('.daily-progress li')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/#/home');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
