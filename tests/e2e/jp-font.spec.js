import { test, expect } from '@playwright/test';

test('settings offer at least five Japanese fonts and the choice reaches the games', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/settings');
  const options = page.locator('.jp-font-option');
  expect(await options.count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('input[name="jp-font"][value="mincho"]')).toBeChecked();
  await expect(page.locator('.jp-font-option', { hasText: 'Caderno escolar' }).locator('.jp-font-sample')).toHaveCSS('font-family', /Klee One/);
  await page.locator('.jp-font-option', { hasText: 'Caderno escolar' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-jp-font', 'kyokasho');
  await expect(page.locator('#toast')).toContainText('Caderno escolar');
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')))).preferences.jpFont).toBe('kyokasho');

  await page.route('**/api/audio', route => route.fulfill({ json: { url: 'https://audio1.tts.quest/v1/data/abcd/audio.mp3s', expiresAt: Date.now() + 600000 } }));
  await page.route('https://audio1.tts.quest/**', route => route.fulfill({ status: 404 }));
  await page.goto('/#/arcade/karuta');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('.karuta-card').first()).toHaveCSS('font-family', /Klee One/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-jp-font', 'kyokasho');
  await page.goto('/#/daily');
  await expect(page.locator('.play-prompt')).toHaveCSS('font-family', /Klee One/);
  // Fora dos jogos, a leitura continua com a letra do tema.
  await page.goto('/#/home');
  await expect(page.locator('.play-hero h1')).not.toHaveCSS('font-family', /Klee One/);
  expect(errors).toEqual([]);
});
