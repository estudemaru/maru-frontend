import { test, expect } from "@playwright/test";

const localVoice = { name: "Kyoko", lang: "ja-JP", localService: true };
const remoteVoice = { name: "Google Japanese", lang: "ja-JP", localService: false };
const portugueseVoice = { name: "Português", lang: "pt-BR", localService: true, default: true };

async function installSpeech(page, { voices = [portugueseVoice, remoteVoice, localVoice], mode = "play" } = {}) {
  await page.addInitScript(({ voices, mode }) => {
    window.speechCalls = []; window.speechCancels = 0; window.audioInstances = 0;
    window.testVoices = voices;
    let current = null, endTimer = null;
    const synthesis = new EventTarget();
    Object.assign(synthesis, {
      getVoices: () => window.testVoices,
      speak(utterance) {
        current = utterance;
        window.lastUtterance = utterance;
        window.speechCalls.push({ text: utterance.text, voice: utterance.voice.name, lang: utterance.lang, rate: utterance.rate,
          activation: navigator.userActivation.isActive, delay: performance.now() - window.audioClickTime });
        if (mode === "stall") return;
        if (mode === "error") return queueMicrotask(() => utterance.onerror?.({ error: "voice-unavailable" }));
        utterance.onstart?.();
        endTimer = setTimeout(() => { utterance.onend?.(); current = null; }, 15000);
      },
      cancel() { window.speechCancels++; clearTimeout(endTimer); current?.onerror?.({ error: "canceled" }); current = null; },
      resume() {}
    });
    window.setTestVoices = voices => { window.testVoices = voices; synthesis.dispatchEvent(new Event("voiceschanged")); };
    Object.defineProperty(window, "speechSynthesis", { value: synthesis, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } }, configurable: true });
    const OriginalAudio = window.Audio;
    window.Audio = class extends OriginalAudio { constructor(src) { super(src); window.audioInstances++; window.lastAudio = this; } };
    document.addEventListener("click", () => { window.audioClickTime = performance.now(); }, true);
  }, { voices, mode });
}

async function remoteAudio(page) {
  const requests = [];
  const wave = Buffer.alloc(44 + 48000);
  wave.write("RIFF", 0); wave.writeUInt32LE(wave.length - 8, 4); wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16); wave.writeUInt16LE(1, 20); wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(24000, 24); wave.writeUInt32LE(48000, 28); wave.writeUInt16LE(2, 32); wave.writeUInt16LE(16, 34);
  wave.write("data", 36); wave.writeUInt32LE(48000, 40);
  await page.route("**/api/audio", route => {
    requests.push(route.request().postDataJSON().text);
    return route.fulfill({ json: { url: "https://audio1.tts.quest/v1/data/abcd/audio.mp3s", expiresAt: Date.now() + 600000 } });
  });
  await page.route("https://audio1.tts.quest/**", route => route.fulfill({ contentType: "audio/wav", body: wave }));
  return requests;
}

for (const [device, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
  test(`Japanese speech starts in the ${device} click without waiting for the API, respects speed and stops`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installSpeech(page);
    const requests = await remoteAudio(page);
    await page.goto("/#/settings");
    await page.locator("#setting-audio-rate").selectOption("0.75");
    const button = page.getByRole("button", { name: "Testar pronúncia japonesa" });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAttribute("aria-busy", "false");
    const calls = await page.evaluate(() => window.speechCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ text: "こんにちは", voice: "Kyoko", lang: "ja-JP", rate: .75, activation: true });
    expect(calls[0].delay).toBeLessThan(200);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => window.audioInstances)).toBe(0);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.speechCancels)).toBe(1);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => window.lastUtterance.onend());
    await expect(button).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => window.speechCalls.length)).toBe(2);
  });
}

test("system speech uses the reading taught for a kanji and cancels on navigation", async ({ page }) => {
  await installSpeech(page);
  const requests = await remoteAudio(page);
  await page.goto("/#/vocabulary");
  await page.locator("#word-search").fill("água");
  await page.locator('[data-speak="水"]').click();
  expect(await page.evaluate(() => window.speechCalls.at(-1).text)).toBe("みず");
  await page.locator('a.nav-link[href="#/home"]').click();
  await expect(page.locator(".home-page")).toBeVisible();
  expect(await page.evaluate(() => window.speechCancels)).toBe(1);
  expect(requests).toEqual([]);
});

test("voices arriving after page load become usable without calling the external API", async ({ page }) => {
  await installSpeech(page, { voices: [portugueseVoice] });
  const requests = await remoteAudio(page);
  await page.goto("/#/settings");
  await expect(page.locator("main h1")).toBeVisible();
  await page.evaluate(voice => window.setTestVoices([voice]), localVoice);
  await page.getByRole("button", { name: "Testar pronúncia japonesa" }).click();
  expect(await page.evaluate(() => window.speechCalls[0].voice)).toBe("Kyoko");
  expect(requests).toEqual([]);
});

for (const mode of ["no-japanese", "error", "stall"]) {
  test(`remote speech remains usable when the system voice has ${mode}`, async ({ page }) => {
    await installSpeech(page, { mode, ...(mode === "no-japanese" ? { voices: [portugueseVoice] } : {}) });
    const requests = await remoteAudio(page);
    await page.goto("/#/settings");
    const button = page.getByRole("button", { name: "Testar pronúncia japonesa" });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true", { timeout: 6000 });
    expect(requests).toEqual(["こんにちは"]);
    expect(await page.evaluate(() => window.speechCalls.length)).toBe(mode === "no-japanese" ? 0 : 1);
    expect(await page.evaluate(() => window.lastAudio.currentSrc)).toContain("tts.quest");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect(requests).toHaveLength(1);
    expect(await page.evaluate(() => window.speechCalls.length)).toBe(mode === "no-japanese" ? 0 : 1);
  });
}

test("canceling a stalled voice cannot start delayed speech or a remote request", async ({ page }) => {
  await page.clock.install();
  await installSpeech(page, { mode: "stall" });
  const requests = await remoteAudio(page);
  await page.goto("/#/settings");
  const button = page.getByRole("button", { name: "Testar pronúncia japonesa" });
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await button.click();
  await expect(button).toHaveAttribute("aria-busy", "false");
  await page.clock.fastForward(5000);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => window.audioInstances)).toBe(0);
  await expect(button).toHaveAttribute("aria-pressed", "false");
});

test("listening games use the system voice without API preloads", async ({ page }) => {
  await installSpeech(page);
  const requests = await remoteAudio(page);
  await page.goto("/#/arcade/karuta");
  await page.getByRole("button", { name: "Vamos jogar" }).click();
  await expect(page.locator("#karuta-status")).toHaveText("Qual carta você ouviu?");
  await expect(page.locator(".karuta-card").first()).toBeEnabled();
  expect(await page.evaluate(() => window.speechCalls.length)).toBe(1);
  expect(requests).toEqual([]);
});
