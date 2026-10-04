import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { ALL_KANA } from "../../shared/catalog.js";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-maru-user": "e2e-" + randomUUID() });
});

async function go(page, route = "home") {
  await page.goto("/#/" + route);
  await expect(page.locator("main h1")).toBeVisible();
}

test("kana sessions score real answers and keep them after reloading", async ({ page }) => {
  await go(page, "kana");
  await expect(page.locator(".practice-setup")).toContainText("5 caracteres selecionados");
  await page.locator('[data-kana="start"]').click();
  for (let i = 0; i < 5; i++) {
    const char = await page.locator(".quiz-character").innerText();
    const answer = ALL_KANA.find(item => item.char === char).romaji;
    await page.locator('input[name="answer"][value="' + answer + '"]').check();
    await page.getByRole("button", { name: "Verificar resposta", exact: true }).click();
    await page.locator('[data-practice="next"]').click();
  }
  await expect(page.locator(".completion")).toContainText("5 de 5");
  await page.reload();
  await expect(page.locator("#xp-total")).toHaveText("40 XP");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("maru-learning-v2")));
  expect(Object.keys(saved.reviews)).toHaveLength(5);
  expect(saved.kanaStats["h-a-0"].attempts).toBe(1);
});

test("typed kana answers work independently of the paused course", async ({ page }) => {
  await go(page, "kana");
  await page.locator("#kana-mode").selectOption("typed");
  await page.locator('[data-kana="start"]').click();
  const char = await page.locator(".quiz-character").innerText();
  const answer = ALL_KANA.find(item => item.char === char).romaji;
  await page.locator("#typed-answer").fill(answer);
  await page.getByRole("button", { name: "Verificar resposta", exact: true }).click();
  await expect(page.locator(".feedback")).toHaveClass(/success/);

});

test("the sentence route transcribes Japanese and credits an answer only once", async ({ page }) => {
  await go(page, "sentences");
  await page.locator('#arcade-script').selectOption('kana');
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  const prompt = await page.locator('.play-prompt').textContent();
  expect(prompt).toMatch(/^[ぁ-ゖァ-ヺー。、]+$/u);
  await expect(page.locator('#arcade-answer')).toHaveAttribute('lang','ja');
  await page.locator('#arcade-answer').fill(prompt);
  await page.locator('#arcade-check').click();
  await expect(page.locator('#arcade-feedback')).toContainText('Isso!');
  const count = () => page.evaluate(() => JSON.parse(localStorage.getItem("maru-learning-v2")).stats.sentencesWritten);
  expect(await count()).toBe(1);
  await expect(page.locator('#arcade-check')).toBeDisabled();
  await page.locator('#arcade-answer-form').dispatchEvent('submit');
  expect(await count()).toBe(1);
  await page.reload();
  expect(await count()).toBe(1);
});

test("the notebook animates actual strokes, retains ink with the guide and registers practice once", async ({ page }) => {
  await go(page, "writing/あ");
  await expect(page.locator("#stroke-count")).toHaveText("3 traços");
  await page.locator("#next-stroke").click();
  await expect(page.locator("#stroke-caption")).toContainText("Traço 1 de 3");
  await page.locator("#play-strokes").click();
  await expect(page.locator("#stroke-caption")).toContainText("Traço 3 de 3", { timeout: 5000 });
  const canvas = page.locator("#writing-canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 90, { steps: 15 });
  await page.mouse.up();
  const before = await canvas.evaluate(element => element.toDataURL());
  await page.locator("#toggle-guide").click();
  expect(await canvas.evaluate(element => element.toDataURL())).toBe(before);
  await page.locator("#save-writing").click();
  await expect(page.locator("#save-writing")).toBeDisabled();
  await expect(page.locator("#xp-total")).toHaveText("5 XP");
  await page.locator("#clear-writing").click();
  expect(await canvas.evaluate(element => element.toDataURL())).not.toBe(before);
  await page.locator("#writing-group").selectOption("kanji");
  await expect(page.locator("#stroke-count")).toHaveText("1 traço");
});

test("expressions can be filtered, found and added to a functioning review", async ({ page }) => {
  await go(page, "expressions");
  await page.locator('[data-category="slang"]').click();
  await page.locator("#expression-search").fill("yabai");
  await expect(page.locator(".expression-card")).toHaveCount(1);
  await page.locator("[data-add-review]").click();
  await go(page, "review");
  await expect(page.locator("#start-review")).toBeVisible();
  await page.locator("#start-review").click();
  await expect(page.locator(".quiz-character")).toHaveText("やばい");
  await expect(page.locator(".answer-option")).toHaveCount(4);
});

test("offline changes and existing v1 progress survive and resume", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("maru-learning-v2")) {
      localStorage.setItem("maru-xp-v1", JSON.stringify({ total: 123 }));
      localStorage.setItem("maru-kana-v1", JSON.stringify({ "h-a-0": { attempts: 3, wrong: 0, streak: 3 } }));
    }
  });
  await page.route("**/api/progress", route => route.abort());
  await go(page, "settings");
  await expect(page.locator("#xp-total")).toHaveText("123 XP");
  await page.locator("#setting-romaji").uncheck();
  await page.locator('input[name="daily-goal"][value="10"]').check();
  await expect(page.locator("#save-status")).toHaveText("Salvo neste navegador");
  await page.reload();
  await expect(page.locator("#setting-romaji")).not.toBeChecked();
  await expect(page.locator('input[name="daily-goal"][value="10"]')).toBeChecked();
  await go(page, "review");
  await expect(page.locator("#start-review")).toBeVisible();
});

test("all screens render without browser errors and without horizontal overflow at mobile widths", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["home", "journey", "kana", "kanji", "writing", "sentences", "particles", "expressions", "library", "review", "settings", "lesson/welcome"]) {
      await go(page, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      expect(overflow, route + " overflows at " + width).toBe(false);
    }
  }
  expect(errors).toEqual([]);
});

test("mobile navigation works with keyboard and browser history", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await go(page);
  await page.locator("#menu-button").click();
  await expect(page.locator("#menu-button")).toHaveAttribute("aria-expanded", "true");
  await page.locator('#sidebar [data-nav="explore"]').click();
  await page.locator('.hub-card[href="#/kana"]').click();
  await expect(page.locator("h1")).toHaveText("Cada símbolo tem um som.");
  await expect(page.locator("#menu-button")).toHaveAttribute("aria-expanded", "false");
  await page.goBack();
  await expect(page.locator("#resource-search")).toBeVisible();
  await page.goBack();
  await expect(page.locator(".play-hero")).toBeVisible();
  await page.locator("#menu-button").click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#menu-button")).toBeFocused();
});
