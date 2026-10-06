import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { createAuth } from "../../../maru-backend/supabase/functions/maru-api/auth.js";
import { createMaruHandler } from "../../../maru-backend/supabase/functions/maru-api/index.js";
import { normalizeSnapshot } from "../../shared/progress.js";

const user = { id: "a1234567-1234-1234-1234-123456789abc", email: "pessoa@example.test", user_metadata: { name: "Pessoa" } };

for (const [device, options] of [
  ["desktop", { viewport: { width: 1440, height: 1000 } }],
  ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]
]) {
  test(`login survives closing the ${device} browser and renews an expired access token`, async ({ playwright, browserName, baseURL }, testInfo) => {
    let refreshCalls = 0, context;
    const auth = createAuth({
      supabaseUrl: "https://example.supabase.co", anonKey: "public-key", publicOrigin: baseURL,
      fetchImpl: async (input, init) => {
        const url = new URL(input);
        if (url.pathname.endsWith("/settings")) return Response.json({ external: { email: true } });
        if (url.pathname.endsWith("/user")) return Response.json(user);
        if (url.searchParams.get("grant_type") === "refresh_token") {
          expect(JSON.parse(init.body).refresh_token).toBe("r".repeat(40));
          refreshCalls++;
        }
        return Response.json({ access_token: refreshCalls ? "new.access.token" : "old.access.token", refresh_token: "r".repeat(40), expires_in: 3600, user });
      }
    });
    const snapshots = new Map();
    const handler = createMaruHandler({ auth, repository: {
      async read(owner) { return snapshots.get(owner) || normalizeSnapshot({ xp: { total: owner.startsWith("account:") ? 90 : 30 } }); },
      async write(owner, snapshot) { snapshots.set(owner, snapshot); return snapshot; }
    } });
    const server = createServer(async (incoming, outgoing) => {
      try {
        const chunks = [];
        for await (const chunk of incoming) chunks.push(chunk);
        const response = await handler(new Request(baseURL + incoming.url, {
          method: incoming.method, headers: incoming.headers,
          ...(["GET", "HEAD"].includes(incoming.method) ? {} : { body: Buffer.concat(chunks) })
        }));
        outgoing.writeHead(response.status, {
          "content-type": response.headers.get("content-type"),
          "cache-control": "no-store", "set-cookie": response.headers.getSetCookie()
        });
        outgoing.end(await response.text());
      } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = "http://127.0.0.1:" + server.address().port;
    const profile = testInfo.outputPath("browser-profile");
    await mkdir(profile, { recursive: true });
    const openBrowser = async () => {
      const browser = await playwright[browserName].launchPersistentContext(profile, {
        headless: true, baseURL, ...options,
        ...(process.env.MARU_BROWSER_PATH ? { executablePath: process.env.MARU_BROWSER_PATH } : {})
      });
      await browser.route("**/api/**", async route => {
        const response = await route.fetch({ url: origin + new URL(route.request().url()).pathname });
        await route.fulfill({ response });
      });
      return browser;
    };
    try {
      context = await openBrowser();
      let page = await context.newPage();
      await page.goto("/#/account");
      await page.locator("#account-email").fill(user.email);
      await page.locator("#account-password").fill("password123");
      await page.locator("#email-submit").click();
      await expect(page.locator(".account-panel")).toContainText("Pessoa");
      await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
      const cookie = (await context.cookies()).find(value => value.name === "maru_refresh");
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 360 * 86400);
      // The short-lived access cookie can expire while the browser is closed.
      await context.clearCookies({ name: "maru_access" });
      await context.close(); context = null;
      context = await openBrowser();
      page = await context.newPage();
      await page.goto("/#/settings");
      await expect(page.locator(".account-panel")).toContainText("Pessoa");
      await expect(page.locator("#xp-total")).toHaveText("90 XP");
      expect(refreshCalls).toBe(1);
      expect((await context.cookies()).find(value => value.name === "maru_access").value).toBe("new.access.token");
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("maru-active-account")).id)).toBe(user.id);
    } finally {
      await context?.close();
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  });
}
