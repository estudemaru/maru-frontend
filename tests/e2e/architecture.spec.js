import { test, expect } from "@playwright/test";
import { PLACEMENT_QUESTIONS } from "../../shared/placement.js";
import { normalizeSnapshot } from "../../shared/progress.js";
import { LESSONS } from "../../shared/curriculum.js";

const saved = page => page.evaluate(()=>JSON.parse(localStorage.getItem("maru-learning-v2")));
test("home and account have no financial support links or configuration request",async({page})=>{
  const requests=[];
  page.on("request",request=>{if(request.url().endsWith("/api/config"))requests.push(request.url());});
  for(const route of ["home","settings"]){
    await page.goto("/#/"+route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("link",{name:/Apoie|Apoiar/})).toHaveCount(0);
    await expect(page.locator('a[href="#/support"]')).toHaveCount(0);
  }
  expect(requests).toEqual([]);
});

test("account migration and sign-out keep guest and account caches separate",async({page})=>{
  const id="a1234567-1234-1234-1234-123456789abc";
  let signed=true;
  let remote=normalizeSnapshot({xp:{total:90},lessons:{sounds:{completedAt:20}},updatedAt:20});
  await page.addInitScript(()=>{
    if(!localStorage.getItem("maru-learning-v2"))localStorage.setItem("maru-learning-v2",JSON.stringify({xp:{total:30},lessons:{welcome:{completedAt:10}},updatedAt:10}));
  });
  await page.route("**/api/account",route=>route.fulfill({json:{user:signed?{id,name:"Pessoa",email:"pessoa@example.test"}:null,googleEnabled:false,emailEnabled:true}}));
  await page.route("**/api/progress",async route=>{
    if(route.request().method()==="PUT")remote=route.request().postDataJSON();
    await route.fulfill({json:signed?remote:normalizeSnapshot({xp:{total:30},lessons:{welcome:{completedAt:10}},updatedAt:10})});
  });
  await page.route("**/api/auth/logout",async route=>{signed=false;await route.fulfill({json:{ok:true}});});
  await page.goto("/#/settings/login-success");
  await expect(page.locator(".account-panel")).toContainText("Pessoa");
  await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
  await expect.poll(async()=>page.evaluate(id=>JSON.parse(localStorage.getItem("maru-account-"+id+"-v2"))?.xp.total,id)).toBe(90);
  const account=await page.evaluate(id=>JSON.parse(localStorage.getItem("maru-account-"+id+"-v2")),id);
  expect(account.lessons.welcome.completedAt).toBe(10);
  expect(account.lessons.sounds.completedAt).toBe(20);
  expect((await saved(page)).xp.total).toBe(30);
  // A different tab changing identity stops synchronization, while this tab's work stays local.
  await page.evaluate(()=>{
    localStorage.removeItem("maru-active-account");
    window.dispatchEvent(new StorageEvent("storage",{key:"maru-active-account"}));
  });
  await expect(page.locator("#save-status")).toHaveText("Conta alterada · recarregue");
  await page.locator('input[name="daily-goal"][value="10"]').check();
  await expect(page.locator("#save-status")).toHaveText("Conta alterada · recarregue");
  expect(await page.evaluate(id=>JSON.parse(localStorage.getItem("maru-account-"+id+"-v2")).preferences.dailyGoal,id)).toBe(10);
  await page.getByRole("button",{name:"Sair desta conta",exact:true}).click();
  await expect(page.locator("#email-account-form")).toBeVisible();
  await expect(page.locator("#xp-total")).toHaveText("30 XP");
});
