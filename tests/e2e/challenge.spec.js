import { test, expect } from '@playwright/test';

test('legacy challenge links open the new arcade and timers stop after navigation',async({page})=>{
  await page.clock.install();
  await page.goto('/#/challenge');
  await page.locator('#arcade-duration').selectOption('60');
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  await page.getByRole('link',{name:'Todos os jogos',exact:false}).click();
  await page.clock.fastForward(120000);
  await expect(page.locator('.play-card')).toHaveCount(4);
  await expect(page.locator('.play-results')).toHaveCount(0);
});
test('novice references still provide kana readings',async({page})=>{
  await page.goto('/#/vocabulary');
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.locator('main').innerText()).not.toMatch(/\p{Script=Han}/u);
});
