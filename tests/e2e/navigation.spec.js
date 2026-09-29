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
