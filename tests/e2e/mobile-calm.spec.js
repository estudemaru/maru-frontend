import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test.beforeEach(async ({ context, page }) => {
  await context.setExtraHTTPHeaders({ 'x-maru-user': 'e2e-' + randomUUID() });
  await page.route(/(ytimg\.com|youtube-nocookie\.com|youtube\.com)/, route => route.abort());
});

// No celular cada tela mostra o essencial; frase de exemplo, contexto e avisos ficam a um toque
// ou só aparecem em tela larga. No computador tudo continua à vista, como antes.
test('on a phone the reference cards keep their details one tap away; the desktop shows everything', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/vocabulary');
  const word = page.locator('.word-card').first();
  await expect(page.locator('.learning-intro')).toBeHidden();
  await expect(word.locator('.example')).toBeHidden();
  await word.locator('.card-more > summary').click();
  await expect(word.locator('.example')).toBeVisible();
  await expect(word.locator('[data-add-review]')).toBeVisible();

  await page.goto('/#/glossary');
  const term = page.locator('.concept-card').first();
  await expect(term.locator('p').first()).toBeHidden();
  await term.locator('summary').click();
  await expect(term.locator('p').first()).toBeVisible();

  await page.goto('/#/particles');
  await expect(page.locator('.particle-card .example').first()).toBeHidden();
  await page.locator('.particle-card .card-more > summary').first().click();
  await expect(page.locator('.particle-card .example').first()).toBeVisible();
  await expect(page.locator('.particle-card').first().locator('.example-note')).toHaveCount(1);

  await page.goto('/#/home');
  await expect(page.locator('.play-hero-art')).toBeHidden();
  // Duas sugestões de prática ficam na primeira tela; o Arcade reúne todos os jogos.
  expect(await page.locator('.play-card').first().evaluate(card => card.getBoundingClientRect().top + scrollY)).toBeLessThan(900);
  await expect(page.locator('.play-card')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Ver todos os jogos' })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/vocabulary');
  await expect(page.locator('.word-card .card-more')).toHaveCount(0);
  await expect(page.locator('.word-card').first().locator('.example')).toBeVisible();
  await expect(page.locator('.learning-intro')).toBeVisible();
  await page.goto('/#/glossary');
  await expect(page.locator('details.concept-card')).toHaveCount(0);
  await expect(page.locator('.concept-card p').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('on a phone the extras of each screen step aside', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/progress');
  // Sem treino ainda, os cartões não mostram uma lista vazia de pontos fortes.
  await expect(page.locator('.play-progress-card details')).toHaveCount(0);
  await page.goto('/#/settings');
  await expect(page.locator('.audio-status-note')).toBeHidden();
  await expect(page.locator('.theme-card small').first()).toBeHidden();
  await page.goto('/#/exercises');
  await expect(page.locator('.exercise-card p').first()).toBeHidden();
  await expect(page.locator('.exercise-card .btn').first()).toHaveText(/^Começar/);
  await page.goto('/#/review');
  await expect(page.locator('#current-location')).toHaveText('Minha revisão');
  for (const route of ['home', 'journey', 'explore', 'vocabulary', 'expressions', 'settings', 'videos', 'kanji']) {
    await page.goto('/#/' + route);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
  }
});
