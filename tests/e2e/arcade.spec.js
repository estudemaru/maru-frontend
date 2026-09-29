import { test, expect } from '@playwright/test';
import { buildPool } from '../../shared/arcade.js';

test('home stays compact and usable from 320px to desktop', async ({ page }) => {
  const errors=[]; page.on('pageerror', error=>errors.push(error.message));
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('/#/home');
    await expect(page.locator('.play-card')).toHaveCount(6);
    await expect(page.locator('.play-hero h1')).toBeVisible();
    await page.locator('.play-card-art img').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
    await expect.poll(() => page.locator('.play-card-art img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width > 820) await expect.poll(() => page.locator('.sidebar').evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(0);
    await page.screenshot({path:`test-results/arcade-home-${width}.png`,fullPage:true});
  }
  expect(errors).toEqual([]);
});
test('infinite pictures accept the selected script, reveal feedback and persist', async ({ page }) => {
  await page.goto('/#/arcade/pictures');
  await page.locator('#arcade-script').selectOption('kanji');
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  for(let i=0;i<17;i++) {
    const image = await page.locator('#question-image').getAttribute('src');
    const item = buildPool({game:'pictures',script:'kanji'}).find(item=>image.includes(`-${item.image}.png`));
    await expect(page.locator('#arcade-check')).toBeEnabled();
    await page.locator('#arcade-answer').fill(item.answers[0]);
    await page.locator('#arcade-check').click();
    await expect(page.locator('#arcade-feedback')).toContainText('Isso!');
    await page.locator('#arcade-next').click();
  }
  await page.locator('#arcade-finish').click();
  await expect(page.locator('.play-results-stats')).toContainText('17/17');
  await page.reload();
  await page.goto('/#/progress');
  await expect(page.locator('.play-heading')).toContainText('17 respostas');
  await page.locator('.play-progress-card').nth(1).locator('summary').click();
  await expect(page.locator('.play-progress-card').nth(1)).toContainText('100%');
});
test('transcription, recognition and Japanese to Portuguese translation accept their models', async ({ page }) => {
  for(const config of [
    {game:'difference',script:'kana'},
    {game:'sentences',script:'all'},
    {game:'sentences',script:'kana'},
    {game:'translate',script:'all'},
    {game:'translate',script:'kana'}
  ]) {
    await page.goto('/#/home');
    await page.goto('/#/arcade/'+config.game);
    await page.locator('#arcade-script').selectOption(config.script);
    await expect(page.locator('#arcade-direction')).toHaveCount(0);
    await page.getByRole('button',{name:'Vamos jogar'}).click();
    await expect(page.locator('#arcade-answer')).toHaveCount(config.game === 'difference' ? 0 : 1);
    const prompt = await page.locator('.play-prompt').textContent();
    const choices = await page.locator('.play-choice').allTextContents();
    const item = buildPool(config).find(item=>item.prompt===prompt && (!choices.length || choices.includes(item.answers[0])));
    expect(item).toBeTruthy();
    if(config.game==='difference') await page.locator(`[data-choice="${item.answers[0]}"]`).click();
    else { await page.locator('#arcade-answer').fill(item.answers[0]); await page.locator('#arcade-check').click(); }
    await expect(page.locator('#arcade-feedback')).toContainText('Isso!');
    await page.locator('#arcade-next').click();
    await page.locator('#arcade-skip').click();
    await expect(page.locator('#arcade-feedback')).toContainText('Compare com o modelo');
    await page.locator('#arcade-finish').click();
    await expect(page.locator('.play-results-stats')).toContainText('1/2');
  }
});
test('absolute deadline rejects late answers and records personal best once', async ({ page }) => {
  await page.clock.install();
  await page.goto('/#/arcade/difference');
  await page.locator('#arcade-duration').selectOption('60');
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  const prompt=await page.locator('.play-prompt').textContent();
  const choices=await page.locator('.play-choice').allTextContents();
  const item=buildPool({game:'difference',script:'kana'}).find(item=>item.prompt===prompt && choices.includes(item.answers[0]));
  await page.locator(`[data-choice="${item.answers[0]}"]`).click();
  await page.locator('#arcade-next').click();
  await page.clock.fastForward(61000);
  await expect(page.locator('.play-results-stats')).toContainText('1/1');
  await expect(page.locator('.play-result-hero')).toContainText('SEU NOVO RECORDE');
  await page.locator('#arcade-restart').click();
  await expect(page.locator('.play-session-note')).toContainText('Recorde pessoal: 100');
});
test('paused areas cannot be opened via direct routes and repetition still prints', async ({ page }) => {
  for(const route of ['themes/anime','teacher','package/test','worksheets/book','worksheets/activities']) {
    await page.goto('/#/'+route);
    await expect(page.locator('.play-paused')).toBeVisible();
  }
  for(const route of ['journey','lesson/welcome','placement']) {
    await page.goto('/#/'+route);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('.play-paused')).toHaveCount(0);
  }
  await page.goto('/#/worksheets');
  await expect(page.locator('#worksheet-kind option')).toHaveCount(1);
  await expect(page.locator('#print-worksheet')).toBeEnabled();
  await expect(page.locator('.paper-row').first()).toBeVisible();
});
test('mobile setup, keyboard and results stay within the viewport', async ({ page }) => {
  await page.setViewportSize({width:320,height:720});
  await page.goto('/#/arcade/pictures');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  await expect(page.locator('#arcade-check')).toBeEnabled();
  await page.locator('#arcade-answer').fill('wrong');
  await page.locator('#arcade-answer').press('Enter');
  await expect(page.locator('#arcade-feedback')).toContainText('Compare com o modelo');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/arcade-mobile-feedback.png',fullPage:true});
  await page.locator('#arcade-finish').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
