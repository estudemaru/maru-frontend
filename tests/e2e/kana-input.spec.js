import { test, expect } from '@playwright/test';
import { dailyWord } from '../../shared/daily.js';

test('romaji typed in game fields becomes kana, with a katakana toggle and a final ん', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date(2026, 8, 30, 10) });
  expect(dailyWord('2026-09-30').jp).toBe('コーヒー');
  await page.goto('/#/daily');
  await page.locator('.daily-choice').first().click();
  await page.locator('#daily-next').click();
  const answer = page.locator('#daily-answer');
  await answer.pressSequentially('ko-hi-');
  await expect(answer).toHaveValue('こーひー');
  await answer.fill('');
  await page.locator('[data-kana-mode]').click();
  await expect(page.locator('[data-kana-mode]')).toHaveText('ア');
  await expect(answer).toBeFocused();
  await answer.pressSequentially('ko-hi-');
  await expect(answer).toHaveValue('コーヒー');
  await answer.press('Enter');
  await expect(page.locator('#daily-feedback')).toContainText('Isso!');

  await page.goto('/#/arcade/shiritori');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  const word = page.locator('#shiritori-answer');
  await page.locator('[data-kana-mode]').click();
  await expect(page.locator('[data-kana-mode]')).toHaveText('あ');
  await word.pressSequentially('pan');
  await expect(word).toHaveValue('ぱn');
  await word.press('Enter');
  await expect(page.locator('main')).toContainText('パン');
  expect(errors).toEqual([]);
});

test('the conversion can be turned off in settings', async ({ page }) => {
  await page.goto('/#/settings');
  await page.locator('label.switch:has(#setting-kana-input)').click();
  await expect(page.locator('#setting-kana-input')).not.toBeChecked();
  await page.goto('/#/arcade/shiritori');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('[data-kana-mode]')).toBeHidden();
  await page.locator('#shiritori-answer').pressSequentially('neko');
  await expect(page.locator('#shiritori-answer')).toHaveValue('neko');
});
