import { test, expect } from "@playwright/test";

test("Google and Discord login appear alongside email when enabled by Supabase", async ({ page }) => {
  let holdWrites = false, releaseSave, loginStarted = false;
  await page.route("**/api/account", route => route.fulfill({ json: {
    user: null, googleEnabled: true, discordEnabled: true, emailEnabled: true
  } }));
  await page.route("**/api/progress", async route => {
    if (holdWrites && route.request().method() === "PUT") await new Promise(resolve => { releaseSave = resolve; });
    await route.fulfill({ json: {} });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/account");
  await expect(page.getByRole("link", { name: "Continuar com Google" })).toHaveAttribute("href", "/api/auth/google");
  await expect(page.getByRole("link", { name: "Continuar com Discord" })).toHaveAttribute("href", "/api/auth/discord");
  await expect(page.locator("#email-account-form")).toBeVisible();
  for (const [size, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    await page.setViewportSize(viewport);
    for (const [theme, name] of [["dojo", "sumie"], ["arcade", "arcade"]]) {
      if (await page.locator("html").getAttribute("data-theme") !== theme) await page.locator("#theme-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.screenshot({ path: `docs/previews/account-${name}-${size}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
  await page.route("**/api/auth/discord", route => {
    loginStarted = true;
    return route.fulfill({ status: 303, headers: { location: "/#/settings/login-success" } });
  });
  holdWrites = true;
  await page.locator("#theme-toggle").click();
  await page.getByRole("link", { name: "Continuar com Discord" }).click();
  await expect(page.locator("#discord-login")).toHaveAttribute("aria-disabled", "true");
  await expect.poll(() => Boolean(releaseSave)).toBe(true);
  expect(loginStarted).toBe(false);
  holdWrites = false;
  releaseSave();
  await expect(page).toHaveURL(/#\/settings\/login-success$/);
  await expect(page.locator(".account-notice")).toContainText("Conta conectada");
});

test("email signup, recovery and login are visible without Google", async ({ page }) => {
  let signed = false;
  const requests = [];
  await page.route("**/api/account", route => route.fulfill({ json: {
    user: signed ? { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "Estudante", email: "pessoa@example.test" } : null,
    googleEnabled: false, emailEnabled: true
  } }));
  await page.route("**/api/progress", route => route.fulfill({ json: {} }));
  await page.route("**/api/auth/email/**", route => {
    requests.push({ path: new URL(route.request().url()).pathname, body: route.request().postDataJSON() });
    if (route.request().url().endsWith("/login")) signed = true;
    return route.fulfill({ json: route.request().url().endsWith("/signup") ? { message: "Confirme seu e-mail." } : { message: "Se houver uma conta, enviaremos um link." } });
  });
  await page.goto("/#/account");
  await expect(page.locator("#email-account-form")).toBeVisible();
  await expect(page.locator("#google-login")).toHaveCount(0);
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.locator('#email-mode-signup')).toHaveClass(/is-active/);
  await expect(page.locator('#account-password')).toHaveAttribute('autocomplete','new-password');
  await page.locator("#account-email").fill("pessoa@example.test");
  await page.locator("#account-password").fill("password123");
  await page.locator("#email-submit").click();
  await expect(page.locator("#account-feedback")).toContainText("Confirme seu e-mail");
  expect(requests.at(-1)).toEqual({ path: "/api/auth/email/signup", body: { email: "pessoa@example.test", password: "password123" } });
  await page.locator("#email-recover-toggle").click();
  await page.locator("#email-recover-form button").click();
  await expect(page.locator("#account-feedback")).toContainText("enviaremos um link");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator("#account-password").fill("password123");
  await page.locator("#email-submit").click();
  await expect(page.locator(".account-panel")).toContainText("Estudante");
  expect(requests.at(-1).path).toBe("/api/auth/email/login");
});

test("confirmation links clear tokens from the URL before opening the account", async ({ page }) => {
  let signed = false;
  await page.route("**/api/account", route => route.fulfill({ json: {
    user: signed ? { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "Estudante", email: "pessoa@example.test" } : null,
    emailEnabled: true, googleEnabled: false
  } }));
  await page.route("**/api/progress", route => route.fulfill({ json: {} }));
  await page.route("**/api/auth/email/complete", route => {
    expect(route.request().postDataJSON().refreshToken).toBe("r".repeat(40));
    signed = true;
    return route.fulfill({ json: { user: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } } });
  });
  await page.goto("/#access_token=aaa.bbb.ccc&refresh_token=" + "r".repeat(40) + "&type=signup");
  await expect(page).toHaveURL(/#\/settings\/email-confirmed$/);
  await expect(page.locator(".account-panel")).toContainText("E-mail confirmado");
  expect(page.url()).not.toContain("access_token");
});
