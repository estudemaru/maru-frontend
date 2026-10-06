import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { LESSONS } from '../../shared/curriculum.js';
import { unlockTrail } from './unlock.js';

test.beforeEach(async ({ context }) => { await context.setExtraHTTPHeaders({ 'x-maru-user': 'e2e-' + randomUUID() }); });

const wave = (() => {
  const data = Buffer.alloc(44 + 4800);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(24000, 24); data.writeUInt32LE(48000, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(4800, 40);
  return data;
})();
async function mockVoice(page, respond) {
  const requested = [];
  await page.route('**/api/audio', route => {
    const { text } = route.request().postDataJSON();
    requested.push(text);
    return route.fulfill(respond?.(text, requested.length) || { json: { url: `https://audio1.tts.quest/v1/data/${requested.length.toString(16).padStart(4, 'b')}/audio.mp3s`, expiresAt: Date.now() + 600000 } });
  });
  await page.route('https://audio1.tts.quest/**', route => route.fulfill({ contentType: 'audio/wav', body: wave }));
  return requested;
}
// Leitura em romaji de cada exemplo (fileiras de kana viram um kana por carta, como no jogo).
const romajiOf = lesson => new Map(lesson.sections.flatMap(section => section.examples).flatMap(example => {
  const parts = example.jp.split(/　| → /), sounds = example.romaji.split(/\s*[·→]\s*/);
  return parts.length > 1 && parts.length === sounds.length ? parts.map((part, i) => [part, sounds[i].replace(/\s*\(.*\)$/, '')]) : [[example.jp, example.romaji]];
}));
async function readLesson(page, lesson) {
  // A abertura (objetivo e vídeo) vem antes das partes da lição.
  for (let i = 0; i <= lesson.sections.length; i++) await page.locator('[data-lesson="next"]').click();
  for (const question of lesson.quiz) {
    await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
    await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
    await page.locator('[data-lesson="question-next"]').click();
  }
}

test('the journey is back and a lesson ends with a listening game that preloads each next round', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const requested = await mockVoice(page);
  const lesson = LESSONS[0];
  await page.goto('/#/home');
  await page.locator('.nav-link[data-nav="journey"]').click();
  await expect(page.locator('main h1')).toContainText('Do zero, com direção.');
  await page.getByRole('link', { name: 'Dar o primeiro passo' }).click();
  await readLesson(page, lesson);
  await expect(page.locator('#xp-total')).toHaveText('30 XP');
  await expect(page.locator('.lesson-game-intro h2')).toHaveText('Ouviu, pegou');
  expect(requested).toEqual([]);
  await page.getByRole('button', { name: 'Começar o jogo' }).click();
  let rounds = 0;
  while (await page.locator('.karuta-card').count()) {
    await expect(page.locator('.lesson-game .karuta-status')).toHaveText('Qual carta você ouviu?');
    const heard = requested[rounds];
    await page.locator('.karuta-card', { has: page.locator('span', { hasText: new RegExp(`^${heard}$`) }) }).click();
    await expect(page.locator('.lesson-game .feedback')).toContainText('Pegou');
    rounds++;
    if (rounds < 5) expect(requested.length, 'a voz da próxima rodada já foi pedida').toBe(rounds + 1);
    await page.locator('[data-game="next"]').click();
  }
  expect(rounds).toBe(5);
  expect(new Set(requested).size).toBe(requested.length);
  await expect(page.locator('.completion')).toContainText('+30 XP');
  await expect(page.locator('.lesson-game-result')).toContainText('5 de 5 · mesa limpa!');
  await page.goto('/#/journey/start');
  await expect(page.locator(`a[href="#/lesson/${lesson.id}"]`)).toContainText('5 no jogo');
  expect(errors).toEqual([]);
});

test('reading lessons need no voice, and a voice failure can switch to reading', async ({ page }) => {
  await unlockTrail(page);
  const requested = await mockVoice(page, () => ({ status: 429, json: { error: 'A API de voz pediu um intervalo.', retryAfter: 30 } }));
  const kanji = LESSONS.find(lesson => lesson.moduleId === 'kanji');
  await page.goto('/#/lesson/' + kanji.id);
  await readLesson(page, kanji);
  await expect(page.locator('.lesson-game-intro h2')).toHaveText('Leu, achou');
  await page.getByRole('button', { name: 'Começar o jogo' }).click();
  const readings = romajiOf(kanji);
  const first = await page.locator('.lesson-game-prompt').textContent();
  // Texto exato: "Nihon" também está contido em "Nihongo", e as cartas vêm embaralhadas.
  await page.locator('.karuta-card', { has: page.getByText(readings.get(first), { exact: true }) }).first().click();
  await expect(page.locator('.lesson-game .feedback')).toContainText('Pegou');
  expect(requested).toEqual([]);

  const sounds = LESSONS.find(lesson => lesson.id === 'h-vowels');
  await page.goto('/#/lesson/' + sounds.id);
  await readLesson(page, sounds);
  await page.getByRole('button', { name: 'Começar o jogo' }).click();
  await expect(page.locator('.lesson-game .karuta-status')).toContainText('pediu uma pausa');
  await expect(page.locator('.lesson-game .karuta-card').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Jogar lendo em vez de ouvir' }).click();
  const vowels = romajiOf(sounds);
  for (let round = 0; round < 5; round++) {
    const prompt = await page.locator('.lesson-game-prompt').textContent();
    await page.locator('.karuta-card', { has: page.locator('span', { hasText: new RegExp(`^${vowels.get(prompt)}$`) }) }).click();
    await page.locator('[data-game="next"]').click();
  }
  await expect(page.locator('.lesson-game-result')).toContainText('5 de 5');

  await page.goto('/#/lesson/' + LESSONS[1].id);
  await readLesson(page, LESSONS[1]);
  await page.getByRole('button', { name: 'Pular o jogo' }).click();
  await expect(page.locator('.completion')).toBeVisible();
  await expect(page.locator('.lesson-game-result')).toHaveCount(0);
});
