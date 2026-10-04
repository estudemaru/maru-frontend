import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { LESSONS, getLesson } from '../../shared/curriculum.js';
import { rendaPool } from '../../shared/renda.js';
import { videosFor } from '../../shared/videos.js';

test.beforeEach(async ({ context, page }) => {
  await context.setExtraHTTPHeaders({ 'x-maru-user': 'e2e-' + randomUUID() });
  // Nada de rede externa nos testes: miniaturas e player do YouTube ficam bloqueados.
  await page.route(/(ytimg\.com|youtube-nocookie\.com|youtube\.com)/, route => route.abort());
});
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test('the journey lists stages on a phone, and the desktop line map opens a stage', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/journey');
  await expect(page.locator('main h1')).toHaveText('Do zero, com direção.');
  await expect(page.locator('.trail-next h2')).toHaveText(LESSONS[0].title);
  await expect(page.locator('.trail-stop.is-next')).toContainText('Você está aqui');
  // No celular o mapa repetiria as etapas logo abaixo: elas abrem pela lista.
  await expect(page.locator('.trail-map')).toBeHidden();
  expect(await fits(page)).toBe(true);
  await page.locator('#etapa-katakana > summary').click();
  await expect(page.locator('#etapa-katakana')).toHaveAttribute('open', '');
  await expect(page.locator('#etapa-start')).not.toHaveAttribute('open', '');
  await expect(page.locator('#etapa-katakana .trail-stop')).toHaveCount(8);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/#/journey');
  await expect(page.locator('.trail-map-stop')).toHaveCount(8);
  await page.locator('.trail-map-stop[href="#/journey/kanji"]').click();
  await expect(page.locator('#etapa-kanji')).toHaveAttribute('open', '');
  await page.goto('/#/home');
  await expect(page.locator('.home-start')).toHaveAttribute('href', '#/lesson/' + LESSONS[0].id);
  expect(errors).toEqual([]);
});

test('a kana lesson opens with its goal and video, teaches with tiles and ends with a recap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const lesson = getLesson('h-vowels');
  await page.goto('/#/lesson/h-vowels');
  await expect(page.locator('.lesson-intro h2')).toHaveText(lesson.hook);
  // No celular o plano da lição sai e o botão de começar aparece sem rolar, antes do vídeo.
  await expect(page.locator('.lesson-plan')).toBeHidden();
  await expect(page.locator('[data-lesson="next"]')).toBeInViewport();
  // O player só aparece depois do toque, no domínio sem cookies do YouTube.
  await expect(page.locator('.video-panel iframe')).toHaveCount(0);
  await expect(page.locator('.video-poster')).toBeHidden();
  await page.locator('.lesson-video > summary').click();
  await page.locator('.video-poster').click();
  await expect(page.locator('.video-panel iframe')).toHaveAttribute('src', new RegExp(`youtube-nocookie\\.com/embed/${videosFor('h-vowels')[0].id}`));
  // As outras aulas ficam recolhidas no celular.
  await expect(page.locator('.video-option').first()).toBeHidden();
  await page.locator('.video-more > summary').click();
  await page.locator('.video-option').first().click();
  await expect(page.locator('.video-panel iframe')).toHaveAttribute('src', new RegExp(videosFor('h-vowels')[1].id));
  await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.kana-tile')).toHaveCount(5);
  await expect(page.locator('.kana-tile').first()).toContainText('Dica de memória');
  expect(await fits(page)).toBe(true);
  await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.lesson-recap li')).toHaveCount(lesson.recap.length);
  await expect(page.locator('[data-lesson="next"]')).toHaveText(/Praticar o que aprendi/);
});

test('kana cards switch by touch, keyboard and swipe without losing their sound or memory hint', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/settings');
  await page.locator('#setting-romaji').uncheck();
  await page.goto('/#/lesson/h-vowels');
  await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.lesson-stages [aria-current="step"]')).toHaveText('Aprender');
  await expect(page.locator('.kana-deck-position')).toHaveText('1 de 5');
  await expect(page.locator('.kana-tile').first().locator('.kana-tile-sound strong')).toHaveCount(0);
  await page.locator('[data-reveal="a"]').click();
  await expect(page.locator('.kana-tile').first().locator('.kana-tile-sound strong')).toHaveText('a');
  await page.locator('[data-kana-card="3"]').click();
  await expect(page.locator('.kana-deck-position')).toHaveText('4 de 5');
  await expect(page.locator('.kana-tile').nth(3).locator('.kana-tile-char')).toBeInViewport();
  await expect(page.locator('.kana-tile').nth(3)).toContainText('Dica de memória');
  await expect(page.locator('.kana-tile').nth(3).locator('.kana-tile-char')).toHaveAttribute('data-speak', 'え');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-kana-card="4"]')).toBeFocused();
  await expect(page.locator('[data-kana-card="4"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Home');
  await expect(page.locator('.kana-deck-position')).toHaveText('1 de 5');
  await page.locator('.kana-tiles').evaluate(deck => { deck.scrollLeft = deck.children[2].offsetLeft; });
  await expect(page.locator('[data-kana-card="2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.kana-deck-position')).toHaveText('3 de 5');
  expect(await fits(page)).toBe(true);
  await page.locator('[data-lesson="next"]').click();
  await page.locator('[data-lesson="back"]').click();
  await expect(page.locator('.kana-deck-position')).toHaveText('1 de 5');
  await page.locator('[data-kana-card="4"]').click();
  await expect(page.locator('.kana-deck-position')).toHaveText('5 de 5');
});

test('lesson stages and answer feedback follow mistakes, a retry and completion on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const lesson = getLesson('h-vowels');
  await page.goto('/#/lesson/h-vowels');
  for (let i = 0; i <= lesson.sections.length; i++) await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.lesson-stages [aria-current="step"]')).toHaveText('Praticar');
  await expect(page.locator('.lesson-question-mark')).toHaveText('あ');
  await expect(page.locator('.lesson-question-scene img')).toHaveAttribute('src', '/assets/img/irasutoya-lesson-study.png');
  const wrong = (lesson.quiz[0].answer + 1) % lesson.quiz[0].choices.length;
  await page.locator(`input[name="answer"][value="${wrong}"]`).check();
  await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
  await expect(page.locator('.answer-option.is-wrong')).toHaveCount(1);
  await expect(page.locator('.answer-option.is-correct')).toHaveCount(1);
  await expect(page.locator('.feedback.retry')).toContainText(lesson.quiz[0].explanation);
  await expect(page.locator('.lesson-question-scene img')).toHaveAttribute('src', '/assets/img/irasutoya-lesson-think.png');
  await page.locator('[data-lesson="question-next"]').click();
  for (const question of [...lesson.quiz.slice(1), lesson.quiz[0]]) {
    await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
    await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
    await expect(page.locator('.feedback.success')).toContainText('Isso mesmo!');
    await expect(page.locator('.lesson-question-scene img')).toHaveAttribute('src', '/assets/img/irasutoya-lesson-idea.png');
    await page.locator('[data-lesson="question-next"]').click();
  }
  await expect(page.locator('.lesson-stages [aria-current="step"]')).toHaveText('Jogar');
  await page.getByRole('button', { name: 'Pular o jogo' }).click();
  await expect(page.locator('.lesson-stages .is-done')).toHaveCount(3);
  await expect(page.locator('.lesson-celebration img')).toHaveAttribute('src', '/assets/img/irasutoya-lesson-celebrate.png');
  await expect(page.locator('#xp-total')).toHaveText('30 XP');
  expect(await fits(page)).toBe(true);
});

for (const theme of ['dojo', 'arcade']) {
  test(`mobile lessons keep reading and quiz actions reachable in ${theme}`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const lesson = getLesson('h-vowels');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/journey');
    if (theme === 'arcade') await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const reachable = async button => {
      await expect(button).toBeInViewport();
      await expect.poll(() => button.evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      })).toBe(true);
      expect(await fits(page)).toBe(true);
    };

    for (const width of [320, 390, 768, 820]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/#/journey');
      await reachable(page.locator('.trail-stop.is-next .lesson-row'));
      await page.locator('#etapa-hiragana > summary').click();
      await expect(page.locator('.trail-station[open]')).toHaveCount(1);
      await page.goto('/#/lesson/h-vowels');
      await expect(page.locator('.lesson-video')).not.toHaveAttribute('open', '');
      await reachable(page.locator('[data-lesson="next"]'));
      await page.locator('[data-lesson="next"]').click();
      await expect(page.locator('.topbar')).toBeHidden();
      await expect(page.locator('.mobile-nav')).toBeHidden();
      await reachable(page.getByRole('link', { name: 'Voltar à trilha: Aprenda hiragana', exact: true }));
      await expect.poll(() => page.locator('.lesson-scene-art').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      if (await page.locator('#toast').isVisible()) {
        const toast = await page.locator('#toast').boundingBox();
        const controls = await page.locator('.lesson-controls').boundingBox();
        expect(toast.y + toast.height).toBeLessThanOrEqual(controls.y);
      }
      await reachable(page.locator('[data-lesson="next"]'));
      await page.locator('.kana-tile').last().scrollIntoViewIfNeeded();
      await reachable(page.locator('[data-lesson="next"]'));
      await page.locator('[data-lesson="next"]').click();
      await page.locator('[data-lesson="next"]').click();
      await reachable(page.getByRole('button', { name: 'Verificar resposta', exact: true }));
    }

    await page.setViewportSize({ width: 320, height: 844 });
    for (const question of lesson.quiz) {
      await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
      await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
      await reachable(page.locator('[data-lesson="question-next"]'));
      await page.locator('[data-lesson="question-next"]').click();
    }
    await page.getByRole('button', { name: 'Pular o jogo' }).click();
    await expect(page.locator('.completion')).toContainText('+30 XP');
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await expect(page.locator('.next-stop')).toHaveAttribute('href', '#/lesson/h-ka');
    await expect(page.locator('#xp-total')).toHaveText('30 XP');
    expect(await fits(page)).toBe(true);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
    await expect(page.locator('.video-poster')).toBeVisible();
    await expect(page.locator('.lesson-plan')).toBeVisible();
    await expect(page.locator('.lesson-video > summary')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('illustrated lessons use Irasutoya scenes and matching vocabulary, and restore navigation on exit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/lesson/h-words');
  await page.locator('[data-lesson="next"]').click();
  const art = page.locator('.lesson-word-art');
  await expect(art).toHaveCount(3);
  await expect(art.nth(0)).toHaveAttribute('src', '/assets/img/irasutoya-cat.png');
  await expect(art.nth(1)).toHaveAttribute('src', '/assets/img/irasutoya-dog.png');
  await expect(art.nth(2)).toHaveAttribute('src', '/assets/img/irasutoya-fish.png');
  await expect.poll(() => page.locator('.lesson-reader img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await expect(page.locator('.lesson-art-credit')).toContainText('Mifune Takashi / Irasutoya');
  await page.getByRole('link', { name: 'Voltar à trilha: Aprenda hiragana', exact: true }).click();
  await expect(page.locator('.trail-page')).toBeVisible();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.locator('.mobile-nav')).toBeVisible();

  await page.goto('/#/lesson/daily-order');
  await page.locator('[data-lesson="next"]').click();
  await expect(page.locator('.lesson-scene-art')).toHaveAttribute('src', '/assets/img/irasutoya-lesson-cafe.png');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('.topbar')).toBeVisible();
  expect(await fits(page)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.locator('.topbar')).toBeHidden();
  expect(await fits(page)).toBe(true);
  await page.locator('[data-lesson="next"]').click();
  await page.locator('[data-lesson="next"]').click();
  // A cena das perguntas é neutra, mesmo quando o conteúdo da aula é um café.
  await expect(page.locator('.lesson-question-scene img')).toHaveAttribute('src', '/assets/img/irasutoya-lesson-study.png');
});

test('Só mais um plays by touch on a phone, gives the memory hint on a miss and saves reviews', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  const labels = new Map(rendaPool({ script: 'hiragana', range: 'basic' }).map(item => [item.char, item.label.split(' · ')[1]]));
  const choice = (char, right) => page.locator('.renda-choice').filter({ [right ? 'has' : 'hasNot']: page.locator('.renda-choice-main', { hasText: new RegExp(`^${labels.get(char).replace(/[()]/g, '\\$&')}$`) }) });
  const prompt = async () => (await page.locator('.renda-prompt span').textContent()).trim();
  await page.goto('/#/practice');
  await page.locator('.play-card[href="#/arcade/renda"]').click();
  await page.locator('#renda-duration').selectOption('0');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  for (const total of [100, 210, 330, 460]) {
    await expect(page.locator('.renda-choice').first()).toBeEnabled();
    await choice(await prompt(), true).click();
    await expect(page.locator('.play-scoreboard')).toContainText(String(total));
  }
  // Um erro mostra a resposta certa e a dica de memória da lição; Enter segue.
  await expect(page.locator('.renda-choice').first()).toBeEnabled();
  await choice(await prompt(), false).first().click();
  await expect(page.locator('.renda-feedback')).toContainText('Dica de memória');
  await page.keyboard.press('Enter');
  await expect(page.locator('.renda-feedback')).toBeEmpty();
  expect(await fits(page)).toBe(true);
  await page.locator('#renda-finish').click();
  await expect(page.locator('.play-results-stats')).toContainText('4/5');
  await expect(page.locator('.renda-review li')).toHaveCount(1);
  await page.goto('/#/progress');
  await expect(page.locator('.play-progress-card').first()).toContainText('Só mais um');
  await expect(page.locator('.play-progress-card').first()).toContainText('5 respostas');
  expect(errors).toEqual([]);
});

test('finishing a lesson offers the next stop and a drill with only the letters seen so far', async ({ page }) => {
  const lesson = getLesson('h-sa');
  await page.goto('/#/lesson/h-sa');
  for (let i = 0; i <= lesson.sections.length; i++) await page.locator('[data-lesson="next"]').click();
  for (const question of lesson.quiz) {
    await page.locator(`input[name="answer"][value="${question.answer}"]`).check();
    await page.getByRole('button', { name: 'Verificar resposta', exact: true }).click();
    await page.locator('[data-lesson="question-next"]').click();
  }
  await page.getByRole('button', { name: 'Pular o jogo' }).click();
  await expect(page.locator('.next-stop')).toHaveAttribute('href', '#/lesson/h-ta');
  await page.locator('[data-lesson="renda"]').click();
  await expect(page.locator('#renda-range')).toHaveValue('trail');
  await page.getByRole('button', { name: 'Vamos jogar' }).click();
  await expect(page.locator('.play-session-note')).toContainText('15 caracteres');
});

test('on a phone the worksheet picks a family by touch and keeps the print button in reach', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/worksheets');
  await expect(page.locator('#worksheet-family-control')).toBeHidden();
  await expect(page.locator('.worksheet-family')).toHaveCount(15);
  await page.locator('.worksheet-family[data-family="sa"]').click();
  await expect(page.locator('.worksheet-family[data-family="sa"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.worksheet-char').first()).toHaveAttribute('data-print-char', 'さ');
  await expect(page.locator('#print-worksheet')).toBeEnabled();
  await expect(page.locator('#print-worksheet')).toBeInViewport();
  expect(await fits(page)).toBe(true);
});
