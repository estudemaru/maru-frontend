import { test, expect } from '@playwright/test';

test('legacy challenge links open the new arcade and timers stop after navigation',async({page})=>{
  await page.clock.install();
  await page.goto('/#/challenge');
  await page.locator('#arcade-duration').selectOption('60');
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  await page.getByRole('link',{name:'Todos os jogos',exact:false}).click();
  await page.clock.fastForward(120000);
  await expect(page.locator('.play-card')).toHaveCount(6);
  await expect(page.locator('.play-results')).toHaveCount(0);
});
test('novice references show kanji with furigana rather than hiding it',async({page})=>{
  await page.goto('/#/vocabulary');
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.locator('main').innerText()).toMatch(/\p{Script=Han}/u);
  // Every kanji run sits inside a <ruby> pairing; none appears as loose text.
  const unwrapped = await page.locator('main [lang="ja"]').evaluateAll(nodes => nodes.filter(node =>
    [...node.childNodes].some(child => child.nodeType === 3 && /\p{Script=Han}/u.test(child.textContent))
  ).length);
  expect(unwrapped).toBe(0);
  expect(await page.locator('main ruby:not(:has(rt))').count()).toBe(0);
});
