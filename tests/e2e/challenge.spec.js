import { test, expect } from '@playwright/test';
import { challengeItems } from '../../shared/challenge.js';

const snapshot = page => page.evaluate(()=>JSON.parse(localStorage.getItem('maru-learning-v2')));
test.beforeEach(async ({page})=>{
  await page.route('**/api/account',route=>route.fulfill({json:{user:null,emailEnabled:true,googleEnabled:false}}));
  await page.route('**/api/progress',route=>route.fulfill({json:{}}));
});

test('a timed-out attempt is saved once, then recommends the missed characters', async ({page})=>{
  await page.clock.install();
  await page.goto('/#/challenge/hiragana');
  await page.locator('[name="seconds"]').selectOption('15');
  await page.getByRole('button',{name:/Começar rodada/}).click();
  // Keep the shuffled model identified by its visible sound.
  const sound=await page.locator('.challenge-prompt').innerText();
  const first=challengeItems().find(item=>item.prompt===sound);
  await page.clock.fastForward(15001);
  await expect(page.locator('.feedback')).toContainText('O tempo acabou');
  await expect(page.locator('#challenge-clock')).toHaveText('0 s');
  await page.clock.fastForward(60000);
  expect((await snapshot(page)).kanaStats[first.id].wrong).toBe(1);
  for(let index=1;index<5;index++){
    await page.getByRole('button',{name:'Próxima tentativa'}).click();
    const prompt=await page.locator('.challenge-prompt').innerText();
    const item=challengeItems().find(entry=>entry.prompt===prompt);
    await page.locator(`[data-kana-key="${item.answer}"]`).click();
    await page.getByRole('button',{name:'Conferir resposta'}).click();
    await expect(page.locator('.feedback')).toContainText('Você acertou');
  }
  await page.getByRole('button',{name:'Ver o que revisar'}).click();
  await expect(page.locator('.challenge-results h2')).toHaveText('4 de 5 tentativas certas');
  await expect(page.locator('.challenge-advice')).toContainText(first.answer);
  await expect(page.getByRole('link',{name:'Estudar este ponto'})).toHaveAttribute('href','#/'+first.route);
  expect(Object.keys((await snapshot(page)).reviews)).toHaveLength(5);
});

test('failed audio never starts the clock or records a wrong answer',async({page})=>{
  await page.route('**/api/audio',route=>route.fulfill({status:503,json:{error:'Áudio indisponível.'}}));
  await page.clock.install();
  await page.goto('/#/challenge/listening');
  await page.getByRole('button',{name:/Começar rodada/}).click();
  await page.getByRole('button',{name:'Ouvir e começar'}).click();
  await expect(page.locator('#challenge-status')).toContainText('nenhuma tentativa foi perdida');
  await page.clock.fastForward(120000);
  await expect(page.locator('#challenge-answer')).toBeDisabled();
  expect(Object.keys((await snapshot(page)).reviews)).toHaveLength(0);
  await expect(page.getByRole('button',{name:'Ouvir e começar'})).toBeEnabled();
});

test('untimed phrases accept romaji and show kana feedback',async({page})=>{
  await page.goto('/#/challenge/sentences');
  await page.locator('[name="seconds"]').selectOption('0');
  await page.getByRole('button',{name:/Começar rodada/}).click();
  const prompt=await page.locator('.challenge-prompt').innerText();
  const item=challengeItems('sentences').find(entry=>entry.prompt===prompt);
  await page.locator('#challenge-answer').fill(item.romaji);
  await page.getByRole('button',{name:'Conferir resposta'}).click();
  await expect(page.locator('.feedback')).toContainText('Você acertou');
  expect(await page.locator('.feedback').innerText()).not.toMatch(/\p{Script=Han}/u);
  expect((await snapshot(page)).stats.sentencesWritten).toBe(1);
});

test('novice vocabulary and lessons use kana before the kanji stage',async({page})=>{
  for(const route of ['vocabulary','lesson/sentence-identity']){
    await page.goto('/#/'+route);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.locator('main').innerText()).not.toMatch(/\p{Script=Han}/u);
  }
});

test('new pages fit mobile screens in both themes and timers stop on navigation',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const theme of ['dojo','arcade']){
    for(const width of [320,390,1440]){
      await page.setViewportSize({width,height:800});
      for(const route of ['challenge','videos','account','worksheets']){
        await page.goto('/#/'+route);
        await expect(page.locator('main h1')).toBeVisible();
        await page.evaluate(theme=>document.querySelector(`[data-theme-choice="${theme}"]`).click(),theme);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      }
    }
  }
  await page.clock.install();
  await page.goto('/#/challenge');
  await page.getByRole('button',{name:/Começar rodada/}).click();
  await page.getByRole('link',{name:'Voltar às práticas'}).click();
  await page.clock.fastForward(60000);
  await expect(page.locator('.hub-card')).toHaveCount(4);
  expect(errors).toEqual([]);
});
