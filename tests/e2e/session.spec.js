import { test, expect } from "@playwright/test";
import { normalizeSnapshot } from "../../shared/progress.js";

const user = { id: "a1234567-1234-1234-1234-123456789abc", name: "Pessoa", email: "pessoa@example.test" };
const identity = page => page.evaluate(() => JSON.parse(localStorage.getItem("maru-active-account")));
const resume = page => page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));

async function mockSession(page) {
  const state = { user, unavailable: false, accountReads: 0, writes: [], remote: normalizeSnapshot({ xp: { total: 90 } }) };
  await page.addInitScript(id => {
    localStorage.setItem("maru-imported-guest-" + id, "1");
    localStorage.setItem("maru-learning-v2", JSON.stringify({ xp: { total: 30 } }));
  }, user.id);
  await page.route("**/api/account", route => {
    state.accountReads++;
    return route.fulfill(state.unavailable
      ? { status: 503, json: { error: "Não foi possível verificar sua conta agora." } }
      : { json: { user: state.user, emailEnabled: true } });
  });
  await page.route("**/api/progress", route => {
    if (route.request().method() === "PUT") {
      state.writes.push(route.request().headers()["x-maru-account"]);
      state.remote = route.request().postDataJSON();
    }
    return route.fulfill({ json: state.remote });
  });
  return state;
}

test("temporary auth failures keep the account and its progress after reloading and returning", async ({ page }) => {
  const state = await mockSession(page);
  await page.goto("/#/settings");
  await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
  expect(await identity(page)).toEqual(user);
  state.unavailable = true;
  await page.reload();
  await expect(page.locator(".account-panel")).toContainText(user.name);
  await expect(page.getByRole("button", { name: "Sair desta conta", exact: true })).toBeVisible();
  await expect(page.locator("#xp-total")).toHaveText("90 XP");
  expect(await identity(page)).toEqual(user);
  await page.locator('input[name="daily-goal"][value="10"]').check();
  await expect(page.locator("#save-status")).toHaveText("Salvo neste navegador");
  const previousReads = state.accountReads;
  state.unavailable = false;
  await resume(page);
  await expect.poll(() => state.accountReads).toBeGreaterThan(previousReads);
  await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
  expect(state.remote.preferences.dailyGoal).toBe(10);
  expect(state.writes.every(id => id === user.id)).toBe(true);
  expect(await identity(page)).toEqual(user);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("maru-learning-v2")).xp.total)).toBe(30);
});

test("returning to a clean account renews its session without writing unchanged progress", async ({ page }) => {
  const state = await mockSession(page);
  await page.goto("/#/settings");
  await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
  const previousReads = state.accountReads, previousWrites = state.writes.length;
  await resume(page);
  await expect.poll(() => state.accountReads).toBeGreaterThan(previousReads);
  expect(state.writes).toHaveLength(previousWrites);
  expect(await identity(page)).toEqual(user);
});

test("a different account on return stops synchronization and preserves the original cache", async ({ page }) => {
  const state = await mockSession(page);
  await page.goto("/#/settings");
  await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
  const previousWrites = state.writes.length;
  state.user = { ...user, id: "b1234567-1234-1234-1234-123456789abc" };
  await resume(page);
  await expect(page.locator("#save-status")).toHaveText("Conta alterada · recarregue");
  await page.locator('input[name="daily-goal"][value="10"]').check();
  await expect(page.locator("#save-status")).toHaveText("Conta alterada · recarregue");
  expect(state.writes).toHaveLength(previousWrites);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem("maru-account-" + id + "-v2")).preferences.dailyGoal, user.id)).toBe(10);
});

test("account verification allows a slow renewal to complete", async ({ page }) => {
  await mockSession(page);
  await page.route("**/api/account", async route => {
    await new Promise(resolve => setTimeout(resolve, 5500));
    await route.fulfill({ json: { user, emailEnabled: true } });
  });
  await page.goto("/#/settings");
  await expect(page.locator(".account-panel")).toContainText(user.name, { timeout: 12000 });
  expect(await identity(page)).toEqual(user);
});
