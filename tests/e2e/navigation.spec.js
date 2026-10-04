import { test, expect } from '@playwright/test';
import { NAVIGATION, RESOURCES } from '../../frontend/assets/js/core/navigation.js';

test('the simplified menu and reference links retain navigation context',async({page})=>{
  await page.goto('/#/home');
  await expect(page.locator('.sidebar nav .nav-link')).toHaveText(NAVIGATION.map(item=>item.title),{useInnerText:true});
  for(const item of RESOURCES){
    await page.goto('/#/explore');
    await page.locator('main').getByRole('link',{name:item.title,exact:true}).click();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page).toHaveURL(new RegExp('/#/'+item.route+'$'));
  }
});
test('reference search preserves filters when returning from repetition sheets',async({page})=>{
  await page.goto('/#/explore');
  await page.getByRole('button',{name:'Materiais de apoio',exact:true}).click();
  await page.locator('#resource-search').fill('impressao');
  await expect(page.locator('.hub-card')).toHaveCount(1);
  await page.getByRole('link',{name:'Folhas de repetição',exact:true}).click();
  await expect(page.locator('.paper-row')).toHaveCount(5);
  await page.goBack();
  await expect(page.locator('#resource-search')).toHaveValue('impressao');
  await page.locator('#resource-search').fill('nenhum-item');
  await expect(page.locator('.hub-empty')).toBeVisible();
  await page.getByRole('button',{name:'Limpar filtros',exact:false}).click();
  await expect(page.locator('.hub-card')).toHaveCount(RESOURCES.length);
});
test('mobile navigation traps focus and closes with Escape',async({page})=>{
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:740});
    await page.goto('/#/home');
    await page.locator('#menu-button').click();
    await expect(page.locator('.sidebar .nav-link.is-active')).toBeFocused();
    await expect(page.locator('.app-body')).toHaveAttribute('inert','');
    await page.locator('.profile-link').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.sidebar .brand')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu-button')).toBeFocused();
  }
});

test('phone tabs navigate between sections, retain lesson context and give the keyboard room', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/home');
  const tabs = page.getByRole('navigation', { name: 'Navegação no celular' });
  await expect(tabs).toBeVisible();
  await expect(tabs.locator('[data-nav="home"]')).toHaveAttribute('aria-current', 'page');
  await tabs.getByRole('link', { name: 'Minha trilha' }).click();
  await expect(page).toHaveURL(/#\/journey$/);
  await expect(tabs.locator('[data-nav="journey"]')).toHaveAttribute('aria-current', 'page');
  await page.locator('.trail-line .lesson-row').first().click();
  await expect(page).toHaveURL(/#\/lesson\//);
  await expect(tabs.locator('[data-nav="journey"]')).toHaveAttribute('aria-current', 'location');
  await tabs.getByRole('link', { name: 'Consultar' }).click();
  await expect(page.locator('#resource-search')).toBeVisible();
  await tabs.getByRole('link', { name: 'Meu ritmo' }).click();
  await expect(page.locator('.theme-options')).toBeVisible();
  await tabs.getByRole('link', { name: 'Arcade' }).click();
  await page.locator('.play-card[href="#/arcade/pictures"]').click();
  await expect(tabs.locator('[data-nav="practice"]')).toHaveAttribute('aria-current', 'location');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await page.locator('#arcade-answer').focus();
  await expect(tabs).toBeHidden();
  await page.locator('#arcade-answer').evaluate(input => input.blur());
  await expect(tabs).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(tabs).toBeHidden();
  await expect(page.locator('.mobile-brand')).toBeHidden();
  await expect(page.locator('.sidebar')).toBeVisible();
});

test('phone layouts fit the viewport and keep printing above the bottom tabs', async ({ page }) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['home', 'journey', 'expressions', 'settings', 'worksheets']) {
      await page.goto('/#/' + route);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width);
    }
    await page.goto('/#/home');
    const game = await page.locator('.play-card').first().boundingBox();
    const tabs = await page.locator('.mobile-nav').boundingBox();
    expect(game.y + game.height).toBeLessThan(tabs.y);
  }
  await page.goto('/#/worksheets');
  await expect(page.locator('#print-worksheet')).toBeEnabled();
  const print = await page.locator('.worksheet-print-bar').boundingBox();
  const tabs = await page.locator('.mobile-nav').boundingBox();
  expect(print.y + print.height).toBeLessThan(tabs.y);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.mobile-nav')).toBeHidden();
});
