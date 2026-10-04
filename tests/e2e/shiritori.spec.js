import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createDictionary, startKana, endsInN } from '../../shared/shiritori.js';

const dictionary = createDictionary(JSON.parse(readFileSync(new URL('../../frontend/assets/data/shiritori-words.json', import.meta.url), 'utf8')).words);
const used = page => page.locator('.shiritori-chain .chain-reading').allTextContents();
async function validWord(page, { n = false } = {}) {
  const required = (await page.locator('.shiritori-kana').textContent()).trim();
  const taken = new Set((await used(page)).map(text => dictionary.lookup(text)?.key));
  const options = dictionary.words.filter(word => startKana(word.key) === required && !taken.has(word.key) && endsInN(word.key) === n);
  // Prefere palavras curtas, mas alguns kana só têm palavras longas terminadas em ん.
  return options.find(word => [...word.key].length <= 4) || options[0];
}

test('shiritori chains words, explains invalid moves and records the best chain', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  // Maru sorteia as respostas: com uma semente fixa, a partida é sempre a mesma.
  await page.addInitScript(() => { let seed = 42; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; });
  await page.goto('/#/home');
  await page.getByRole('link', { name: 'Ver todos os jogos' }).click();
  await page.locator('.play-card.is-wide').click();
  await expect(page.locator('.play-setup h1')).toHaveText('Palavra puxa palavra');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('.chain-word')).toHaveCount(1);
  await page.locator('#shiritori-answer').fill('ぬぬぬぬ');
  await page.locator('#shiritori-answer').press('Enter');
  await expect(page.locator('#shiritori-feedback')).toContainText('Não encontrei');
  await expect(page.locator('#shiritori-answer')).toHaveValue('ぬぬぬぬ');
  for (let turn = 1; turn <= 3; turn++) {
    const word = await validWord(page);
    await page.locator('#shiritori-answer').fill(word.written);
    await page.locator('#shiritori-send').click();
    if (await page.locator('.play-results').count()) break;
    await expect(page.locator('.play-scoreboard')).toContainText(`SUAS PALAVRAS${turn}`);
  }
  await page.locator('#shiritori-hint').click();
  await expect(page.locator('#shiritori-feedback')).toContainText('Que tal');
  // Alguns kana não iniciam nenhuma palavra terminada em ん: segue jogando até haver uma.
  let losing = await validWord(page, { n: true }), chain = 3;
  while (!losing && chain < 10) {
    await page.locator('#shiritori-answer').fill((await validWord(page)).reading);
    await page.locator('#shiritori-send').click();
    await expect(page.locator('.play-scoreboard')).toContainText(`SUAS PALAVRAS${++chain}`);
    losing = await validWord(page, { n: true });
  }
  await page.locator('#shiritori-answer').fill(losing.reading);
  await page.locator('#shiritori-send').click();
  await expect(page.locator('.play-result-hero')).toContainText('Terminou em ん');
  await expect(page.locator('.play-result-hero')).toContainText('SEU NOVO RECORDE');
  await expect(page.locator('.shiritori-recap .chain-word').last()).toContainText(losing.reading);
  await page.screenshot({ path: 'test-results/shiritori-results.png', fullPage: true });
  await page.goto('/#/progress');
  await expect(page.locator('.play-progress-card').last()).toContainText(`Maru tranquilo: ${chain} palavras`);
  expect(errors).toEqual([]);
});

test('shiritori turn timer ends the match and mobile layout fits', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.clock.install();
  await page.goto('/#/arcade/shiritori');
  await page.locator('#shiritori-duration').selectOption('20');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('#shiritori-clock')).toHaveText('20s');
  const word = await validWord(page);
  await page.locator('#shiritori-answer').fill(word.reading);
  await page.locator('#shiritori-send').click();
  await expect(page.locator('.chain-word')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/shiritori-mobile.png', fullPage: true });
  await page.clock.fastForward(21000);
  await expect(page.locator('.play-result-hero')).toContainText('O tempo acabou');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
