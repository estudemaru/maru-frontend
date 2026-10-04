import { test, expect } from '@playwright/test';
import { VOCABULARY } from '../../shared/vocabulary.js';

// Áudio controlado: a cota pública do TTS Quest não é usada nos testes.
const wave = (() => {
  const data = Buffer.alloc(44 + 4800);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(24000, 24); data.writeUInt32LE(48000, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(4800, 40);
  return data;
})();
const reading = text => VOCABULARY.find(word => word.jp === text).reading;
const snapshot = page => page.evaluate(() => JSON.parse(localStorage.getItem('maru-learning-v2')));

async function mockVoice(page, respond) {
  const requested = [];
  await page.route('**/api/audio', route => {
    const { text } = route.request().postDataJSON();
    requested.push(text);
    const custom = respond?.(text, requested.length);
    return route.fulfill(custom || { json: { url: `https://audio1.tts.quest/v1/data/${requested.length.toString(16).padStart(4, 'a')}/audio.mp3s`, expiresAt: Date.now() + 600000 } });
  });
  await page.route('https://audio1.tts.quest/**', route => route.fulfill({ contentType: 'audio/wav', body: wave }));
  return requested;
}

test('karuta waits out a 429, preloads the next round and records answers', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const requested = await mockVoice(page, (text, count) => count === 1 ? { status: 429, headers: { 'Retry-After': '2' }, json: { error: 'A API de voz pediu um intervalo.', retryAfter: 2 } } : null);
  await page.goto('/#/home');
  await expect(page.locator('.play-card')).toHaveCount(7);
  await page.locator('.play-card[href="#/arcade/karuta"]').click();
  await expect(page.locator('.play-setup h1')).toHaveText('Ouviu, pegou');
  await page.locator('#karuta-duration').selectOption('60');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();

  await expect(page.locator('#karuta-status')).toContainText('pediu uma pausa');
  await expect(page.locator('#karuta-status')).toContainText('O relógio está parado');
  await expect(page.locator('.karuta-card')).toHaveCount(7);
  await expect(page.locator('.karuta-card').first()).toBeDisabled();
  await page.waitForTimeout(1200);
  await expect(page.locator('#karuta-clock')).toHaveText('60s');

  await expect(page.locator('#karuta-status')).toHaveText('Qual carta você ouviu?', { timeout: 5000 });
  await expect(page.locator('.karuta-card').first()).toBeEnabled();
  const first = requested[1];
  expect(requested[0]).toBe(first);
  await expect.poll(() => requested.length).toBe(3);
  const upcoming = requested[2];
  expect(upcoming).not.toBe(first);

  await page.locator('.karuta-card', { hasText: reading(first) }).first().click();
  await expect(page.locator('#karuta-feedback')).toContainText('Pegou');
  await expect(page.locator('.karuta-card.is-right')).toContainText(reading(first));
  await page.locator('#karuta-next').click();
  await expect(page.locator('#karuta-status')).toHaveText('Qual carta você ouviu?');
  expect(requested.filter(text => text === upcoming)).toHaveLength(1);

  const cards = await page.locator('.karuta-card span').allTextContents();
  const wrong = cards.findIndex(card => card !== reading(upcoming));
  await page.keyboard.press(String(wrong + 1));
  await expect(page.locator('#karuta-feedback')).toContainText('Quase');
  await expect(page.locator('.karuta-card.is-wrong')).toHaveCount(1);
  await page.locator('#karuta-finish').click();
  await expect(page.locator('.play-results-stats')).toContainText('1/2');

  const { reviews } = await snapshot(page);
  const id = text => VOCABULARY.find(word => word.jp === text).id;
  expect(reviews[`arcade:karuta:kana:listen:${id(first)}`]).toMatchObject({ attempts: 1, correct: 1 });
  expect(reviews[`arcade:karuta:kana:listen:${id(upcoming)}`]).toMatchObject({ attempts: 1, correct: 0 });
  await page.goto('/#/progress');
  await expect(page.locator('.play-progress-card', { hasText: 'Ouviu, pegou' })).toContainText('50% de acertos · 2 respostas');
  expect(errors).toEqual([]);
});

test('karuta never records an answer when the voice fails and fits small phones', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  let fail = true;
  await mockVoice(page, () => fail ? { status: 503, json: { error: 'A API de voz não conseguiu preparar esta pronúncia.' } } : null);
  await page.goto('/#/arcade/karuta');
  await page.locator('#karuta-script').selectOption('all');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('#karuta-status')).toContainText('Nenhuma resposta foi registrada');
  await expect(page.locator('#karuta-retry')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('#karuta-feedback')).toBeEmpty();
  expect(Object.keys((await snapshot(page))?.reviews || {}).filter(key => key.startsWith('arcade:karuta'))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  fail = false;
  await page.locator('#karuta-retry').click();
  await expect(page.locator('#karuta-retry')).toBeHidden();
  await expect(page.locator('.karuta-card').first()).toBeEnabled();
  await page.screenshot({ path: 'test-results/karuta-mobile.png', fullPage: true });
});
