import { test, expect } from '@playwright/test';
import { unlockTrail } from './unlock.js';
test.beforeEach(async({page})=>{
 await unlockTrail(page);
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  const payload=path==='/api/ai/status'?{enabled:true}:path==='/api/account'?{user:null}:{};
  return route.fulfill({json:payload});
 });
});
test('phrase coach requests AI explicitly and escapes model output',async({page})=>{
 await page.route('**/api/ai/phrase',route=>route.fulfill({json:{correct:true,message:'<b>Válida</b>',explanation:'Uma variação natural.',model:'学生です。',modelReading:'がくせいです。',romaji:'gakusei desu',source:'ai'}}));
 await page.goto('/#/practice');await page.getByRole('link',{name:'Montar e corrigir frases'}).click();
 await page.locator('[data-mode="typed"]').click();await page.locator('#sentence-ai').check();await page.locator('#sentence-text').fill('gakusei desu');
 await page.getByRole('button',{name:'Verificar frase'}).click();
 await expect(page.locator('.feedback')).toContainText('<b>Válida</b>');await expect(page.locator('.feedback')).toContainText('Uma variação natural.');
 await expect(page.locator('.feedback b')).toHaveCount(0);
});
test('AI login failure preserves deterministic fallback and displays the reason',async({page})=>{
 await page.route('**/api/ai/phrase',route=>route.fulfill({status:401,json:{error:'Entre na sua conta para usar a IA do Maru.'}}));
 await page.goto('/#/sentence-coach');await page.locator('[data-mode="typed"]').click();await page.locator('#sentence-ai').check();await page.locator('#sentence-text').fill('watashi wa gakusei desu');
 await page.getByRole('button',{name:'Verificar frase'}).click();await expect(page.getByRole('alert')).toContainText('Entre na sua conta');await expect(page.locator('.feedback')).toBeVisible();
});
test('lesson tutor sends lesson ID and renders answer as text',async({page})=>{
 await page.route('**/api/ai/tutor',route=>{
  expect(route.request().postDataJSON()).toEqual({lessonId:'welcome',question:'Como estudar?'});
  return route.fulfill({json:{answer:'<img src=x> Estude um pouco todo dia.',source:'ai'}});
 });
 await page.goto('/#/lesson/welcome');await page.getByText('Tirar uma dúvida com o Maru · IA').click();await page.locator('#tutor-question').fill('Como estudar?');await page.getByRole('button',{name:'Perguntar',exact:true}).click();
 await expect(page.locator('[data-lesson-tutor] [role=status]')).toContainText('<img src=x>');await expect(page.locator('[data-lesson-tutor] img')).toHaveCount(0);
});
