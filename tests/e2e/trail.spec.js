import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { LESSONS, getLesson } from '../../shared/curriculum.js';
import { rendaPool } from '../../shared/renda.js';
import { videosFor } from '../../shared/videos.js';

test.beforeEach(async ({ context, page }) => {
  await context.setExtraHTTPHeaders({ 'x-maru-user': 'e2e-' + randomUUID() });
  // Nada de rede externa nos testes: miniaturas e player do YouTube ficam bloqueados.
  await page.route(/(ytimg\.com|youtube-nocookie\.com|youtube\.com)/, route => route.abort());
});
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('the journey lists stages on a phone, and the desktop line map opens a stage', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/journey');
  await expect(page.locator('main h1')).toHaveText('Do zero, com direção.');
  await expect(page.locator('.trail-next h2')).toHaveText(LESSONS[0].title);
  await expect(page.locator('.trail-stop.is-next')).toContainText('Você está aqui');
  // No celular o mapa repetiria as etapas logo abaixo: elas abrem pela lista.
  await expect(page.locator('.trail-map')).toBeHidden();
  expect(await fits(page)).toBe(true);
  await page.locator('#etapa-katakana > summary').click();
  await expect(page.locator('#etapa-katakana')).toHaveAttribute('open', '');
  await expect(page.locator('#etapa-katakana .trail-stop')).toHaveCount(8);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/journey');
  await expect(page.locator('.trail-map-stop')).toHaveCount(8);
  await page.locator('.trail-map-stop[href="#/journey/kanji"]').click();
  await expect(page.locator('#etapa-kanji')).toHaveAttribute('open', '');
  await page.goto('/#/home');
  await expect(page.locator('.home-start')).toHaveAttribute('href', '#/lesson/' + LESSONS[0].id);
  expect(errors).toEqual([]);
});

test('a kana lesson opens with its goal and video, teaches with tiles and ends with a recap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const lesson = getLesson('h-vowels');
  await page.goto('/#/lesson/h-vowels');
  await expect(page.locator('.lesson-intro h2')).toHaveText(lesson.hook);
  // No celular o plano da lição sai e o botão de começar aparece sem rolar, antes do vídeo.
  await expect(page.locator('.lesson-plan')).toBeHidden();
  await expect(page.locator('[data-lesson="next"]')).toBeInViewport();
  // O player só aparece depois do toque, no domínio sem cookies do YouTube.
  await expect(page.locator('.video-panel iframe')).toHaveCount(0);
  await page.locator('.video-poster').click();
  await expect(page.locator('.video-panel iframe')).toHaveAttribute('src', new RegExp(`youtube-nocookie\\.com/embed/${videosFor('h-vowels')[0].id}`));
  // As outras aulas ficam recolhidas no celular.
  await expect(page.locator('.video-option').first()).toBeHidden();
  await page.locator('.video-more > summary').click();
  await page.locator('.video-option').first().click();
  await expect(page.locator('.video-panel iframe')).toHaveAttribute('src', new RegExp(videosFor('h-vowels')[1].id));
  await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.kana-tile')).toHaveCount(5);
  await expect(page.locator('.kana-tile').first()).toContainText('Dica de memória');
  expect(await fits(page)).toBe(true);
  await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.lesson-recap li')).toHaveCount(lesson.recap.length);
  await expect(page.locator('[data-lesson="next"]')).toHaveText(/Praticar o que aprendi/);
});

test('Só mais um plays by touch on a phone, gives the memory hint on a miss and saves reviews', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const labels = new Map(rendaPool({ script: 'hiragana', range: 'basic' }).map(item => [item.char, item.label.split(' · ')[1]]));
  const choice = (char, right) => page.locator('.renda-choice').filter({ [right ? 'has' : 'hasNot']: page.locator('.renda-choice-main', { hasText: new RegExp(`^${labels.get(char).replace(/[()]/g, '\\$&')}$`) }) });
  const prompt = async () => (await page.locator('.renda-prompt span').textContent()).trim();
  await page.goto('/#/practice');
  await page.locator('.play-card[href="#/arcade/renda"]').click();
  await page.locator('#renda-duration').selectOption('0');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  for (const total of [100, 210, 330, 460]) {
    await expect(page.locator('.renda-choice').first()).toBeEnabled();
    await choice(await prompt(), true).click();
    await expect(page.locator('.play-scoreboard')).toContainText(String(total));
  }
  // Um erro mostra a resposta certa e a dica de memória da lição; Enter segue.
  await expect(page.locator('.renda-choice').first()).toBeEnabled();
  await choice(await prompt(), false).first().click();
  await expect(page.locator('.renda-feedback')).toContainText('Dica de memória');
  await page.keyboard.press('Enter');
  await expect(page.locator('.renda-feedback')).toBeEmpty();
  expect(await fits(page)).toBe(true);
  await page.locator('#renda-finish').click();
  await expect(page.locator('.play-results-stats')).toContainText('4/5');
  await expect(page.locator('.renda-review li')).toHaveCount(1);
  await page.goto('/#/progress');
  await expect(page.locator('.play-progress-card').first()).toContainText('Só mais um');
  await expect(page.locator('.play-progress-card').first()).toContainText('5 respostas');
  expect(errors).toEqual([]);
});

test('finishing a lesson offers the next stop and a drill with only the letters seen so far', async ({ page }) => {
  const lesson = getLesson('h-sa');
  await page.goto('/#/lesson/h-sa');
  for (let i = 0; i <= lesson.sections.length; i++) await page.locator('[data-lesson="next"]').click();
  for (const question of lesson.quiz) {
    await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
    await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
    await page.locator('[data-lesson="question-next"]').click();
  }
  await page.getByRole('button', { name: 'Pular o jogo' }).click();
  await expect(page.locator('.next-stop')).toHaveAttribute('href', '#/lesson/h-ta');
  await page.locator('[data-lesson="renda"]').click();
  await expect(page.locator('#renda-range')).toHaveValue('trail');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('.play-session-note')).toContainText('15 caracteres');
});
