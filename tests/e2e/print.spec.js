import { test, expect } from '@playwright/test';
import { KANA } from '../../shared/content.js';
import { BEGINNER_KANJI, SENTENCES } from '../../shared/catalog.js';
import { BOOK_MODULES as MODULES, BOOK_LESSONS as LESSONS, BOOK_KANJI } from '../../frontend/assets/js/features/book-content.js';
import { VOCABULARY, VOCABULARY_GROUPS } from '../../shared/vocabulary.js';
import { PARTICLE_EXERCISES } from '../../shared/exercises.js';
import { PICTURE_WORDS, PRINT_DIALOGUES } from '../../shared/printActivities.js';

const ready = async page => {
  await expect(page.locator('#worksheet-preview')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#print-worksheet')).toBeEnabled();
};
const choose = async (page, selector, value) => {
  await page.locator(selector).selectOption(value);
  await ready(page);
};
async function checkPaper(page, pdfPath) {
  const count = await page.locator('.print-sheet').count();
  expect(count).toBeGreaterThan(0);
  await page.emulateMedia({ media: 'print' });
  const problems = await page.locator('.print-sheet').evaluateAll(papers => papers.flatMap((paper, index) => {
    const body = paper.querySelector('.paper-body');
    const bounds = body.getBoundingClientRect();
    const issues = [];
    if (!body.childElementCount) issues.push('empty body');
    if (body.scrollHeight > body.clientHeight + 1) issues.push('vertical overflow');
    if (body.scrollWidth > body.clientWidth + 1) issues.push('horizontal overflow');
    for (const block of body.children) {
      const rect = block.getBoundingClientRect();
      if (rect.bottom > bounds.bottom + 1) issues.push('content overlaps footer');
    }
    for (const box of paper.querySelectorAll('.paper-box')) {
      const { width, height } = box.getBoundingClientRect();
      if (Math.abs(width - height) > 2 || width < 65) issues.push('unusable writing square');
    }
    if (paper.querySelector('.paper-page-number').textContent !== `${index + 1} / ${papers.length}`) issues.push('wrong page number');
    return issues.map(issue => `${index + 1}: ${issue}`);
  }));
  expect(problems).toEqual([]);
  const pdf = await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
  expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBe(count);
  await page.emulateMedia({ media: 'screen' });
  return count;
}

test('kana flows without unused slots, keeps stroke models and supports optional repetition', async ({ page }, testInfo) => {
  await page.addInitScript(() => { window.printCalls = 0; window.print = () => window.printCalls++; });
  await page.goto('/#/worksheets');
  await ready(page);
  await expect(page.locator('.paper-row[data-print-char]')).toHaveCount(20);
  await expect(page.locator('.print-sheet')).toHaveCount(3);
  await expect(page.locator('#worksheet-repeat-pages')).toHaveValue('0');
  await expect(page.locator('.paper-repeat-grid, .paper-kana-gap')).toHaveCount(0);
  await expect(page.locator('.paper-row').first().locator('.paper-box')).toHaveCount(9);
  expect(await page.locator('.model svg').evaluateAll(models => models.every(svg => svg.querySelectorAll('path').length === svg.querySelectorAll('text').length))).toBe(true);
  await checkPaper(page, testInfo.outputPath('hiragana.pdf'));
  await choose(page, '#worksheet-scope', 'one');
  await expect(page.locator('.print-sheet')).toHaveCount(1);
  await page.locator('.worksheet-char[data-print-char="き"]').click();
  await ready(page);
  await expect(page.locator('.paper-row[data-print-char]')).toHaveCount(1);
  await expect(page.locator('.paper-row[data-print-char]')).toHaveAttribute('data-print-char', 'き');
  await choose(page, '#worksheet-repeat-pages', '2');
  await expect(page.locator('.paper-repeat-grid')).toHaveCount(2);
  await expect(page.locator('.paper-repeat-grid .paper-box')).toHaveCount(198);
  await expect(page.locator('.paper-repeat-grid svg')).toHaveCount(0);
  await checkPaper(page);
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#print-worksheet').click();
  await expect.poll(() => page.evaluate(() => window.printCalls)).toBe(1);
});

test('all selected characters remain in order on compact A4 pages in both themes', async ({ page }) => {
  await page.goto('/#/worksheets');
  await ready(page);
  await choose(page, '#worksheet-script', 'all');
  await choose(page, '#worksheet-scope', 'all');
  const expected = [...KANA.filter(item => item.script === 'hiragana'), ...KANA.filter(item => item.script === 'katakana'), ...BEGINNER_KANJI].map(item => item.char);
  expect(await page.locator('.paper-row[data-print-char]').evaluateAll(rows => rows.map(row => row.dataset.printChar))).toEqual(expected);
  await expect(page.locator('.paper-row[data-print-char="を"]')).toContainText('wo/o');
  for (const theme of ['dojo', 'arcade']) {
    await page.evaluate(theme => document.querySelector(`[data-theme-choice="${theme}"]`).click(), theme);
    await ready(page);
    await expect(page.locator('.print-sheet').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await checkPaper(page);
  }
});

test('words and sentences retain all questions, models and separate answer keys', async ({ page }) => {
  await page.goto('/#/worksheets');
  await ready(page);
  await choose(page, '#worksheet-kind', 'words');
  for (const [group] of VOCABULARY_GROUPS.filter(([id]) => id !== 'all')) {
    await choose(page, '#worksheet-group', group);
    const size = VOCABULARY.filter(item => item.group === group).length;
    await expect(page.locator('.paper-row')).toHaveCount(size);
    await expect(page.locator('.paper-answer')).toHaveCount(size);
    await checkPaper(page);
  }
  await page.locator('#worksheet-models').uncheck();
  await ready(page);
  await expect(page.locator('.paper-word')).toHaveCount(0);
  await choose(page, '#worksheet-kind', 'sentences');
  await page.locator('#worksheet-models').check();
  await ready(page);
  for (let batch = 0; batch < Math.ceil(SENTENCES.length / 5); batch++) {
    await choose(page, '#worksheet-batch', String(batch));
    const size = Math.min(5, SENTENCES.length - batch * 5);
    await expect(page.locator('.paper-question')).toHaveCount(size);
    await expect(page.locator('.paper-answer')).toHaveCount(size);
    await expect(page.locator('.print-sheet').last()).toContainText('Gabarito');
    await checkPaper(page);
  }
  await page.locator('#worksheet-answers').uncheck();
  await ready(page);
  await expect(page.locator('.paper-answer')).toHaveCount(0);
});

test('particles use consecutive pages without stretching answers or orphaning a final item', async ({ page }) => {
  await page.goto('/#/worksheets');
  await ready(page);
  await choose(page, '#worksheet-kind', 'particles');
  await expect(page.locator('.paper-question')).toHaveCount(PARTICLE_EXERCISES.length);
  await expect(page.locator('.paper-answer')).toHaveCount(PARTICLE_EXERCISES.length);
  await expect(page.locator('#worksheet-models')).toBeHidden();
  const count = await checkPaper(page);
  expect(count).toBeLessThanOrEqual(5);
  expect(await page.locator('.paper-body').evaluateAll(bodies => bodies.every(body => body.children.length >= 3))).toBe(true);
  expect(await page.locator('.paper-practice-line').evaluateAll(lines => lines.every(line => line.getBoundingClientRect().height >= 29))).toBe(true);
  await page.locator('#worksheet-answers').uncheck();
  await ready(page);
  await expect(page.locator('.paper-answer')).toHaveCount(0);
  await checkPaper(page);
});

test('illustrated activities and dialogues keep prompts, banks and practice on the same sheet', async ({ page }, testInfo) => {
  await page.goto('/#/worksheets');
  await ready(page);
  await choose(page, '#worksheet-kind', 'activities');
  await expect(page.locator('.paper-image-card img')).toHaveCount(PICTURE_WORDS.length);
  await expect(page.locator('.paper-dialogue')).toHaveCount(PRINT_DIALOGUES.length);
  expect(await page.locator('.paper-image-grid').evaluateAll(grids => grids.every(grid => {
    const paper = grid.closest('.print-sheet');
    return paper.querySelector('.paper-word-bank') && paper.querySelector('.paper-recall-words') && paper.querySelector('.paper-art-credit');
  }))).toBe(true);
  expect(await page.locator('.paper-dialogue').evaluateAll(dialogues => dialogues.every(dialogue => {
    const paper = dialogue.closest('.print-sheet');
    return paper.querySelector('.paper-dialogue-questions') && paper.querySelector('.paper-writing-extension');
  }))).toBe(true);
  const count = await checkPaper(page, testInfo.outputPath('activities.pdf'));
  await page.locator('#worksheet-answers').uncheck();
  await ready(page);
  await expect(page.locator('.paper-picture-answers, .paper-dialogue-answer')).toHaveCount(0);
  const withoutAnswers = await checkPaper(page);
  expect(withoutAnswers).toBeLessThan(count);
  await choose(page, '#worksheet-repeat-pages', '2');
  await expect(page.locator('.print-sheet')).toHaveCount(withoutAnswers + 2);
});

test('the complete book preserves every lesson and exercise with a resolved table of contents', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('/#/worksheets/book');
  await ready(page);
  await expect(page.locator('[data-book-lesson]')).toHaveCount(LESSONS.length);
  await expect(page.locator('[data-book-section]')).toHaveCount(LESSONS.reduce((sum, lesson) => sum + lesson.sections.length, 0));
  await expect(page.locator('[data-book-question]')).toHaveCount(LESSONS.reduce((sum, lesson) => sum + lesson.quiz.length, 0));
  await expect(page.locator('.paper-book-answers')).toHaveCount(LESSONS.length);
  await expect(page.locator('.paper-row[data-print-char]')).toHaveCount(KANA.length + BOOK_KANJI.length);
  // Each complete family gets its own sheet, with marked sounds immediately
  // following their base family. N stays beside WA/WO at the end.
  const familyOrder = ['a', 'ka', 'ga', 'sa', 'za', 'ta', 'da', 'na', 'ha', 'ba', 'pa', 'ma', 'ya', 'ra', 'wa'];
  for (const script of ['hiragana', 'katakana']) {
    const families = await page.locator(`.paper-kana-family[data-script="${script}"]`).evaluateAll(groups => groups.map(group => ({
      id: group.dataset.family,
      chars: [...group.querySelectorAll('[data-print-char]')].map(row => row.dataset.printChar),
      page: Number(group.closest('.print-sheet').querySelector('.paper-page-number').textContent.split('/')[0]),
      familiesOnPage: group.closest('.print-sheet').querySelectorAll('.paper-kana-family').length,
      withinPage: group.getBoundingClientRect().bottom <= group.closest('.paper-body').getBoundingClientRect().bottom + 1
    })));
    expect(families.map(group => group.id)).toEqual(familyOrder);
    for (const [index, family] of families.entries()) {
      expect(family.chars).toEqual(KANA.filter(item => item.script === script && (item.row === family.id || (family.id === 'wa' && item.row === 'n'))).map(item => item.char));
      expect(family.familiesOnPage).toBe(1);
      expect(family.withinPage).toBe(true);
      if (index) expect(family.page).toBe(families[index - 1].page + 1);
    }
  }
  await page.locator('.paper-kana-family[data-script="hiragana"][data-family="ka"]').locator('xpath=ancestor::article').screenshot({ path: testInfo.outputPath('family-ka.png') });
  await expect(page.locator('.paper-book-words > div')).toHaveCount(VOCABULARY.length);
  await expect(page.locator('.paper-question')).toHaveCount(SENTENCES.length + PARTICLE_EXERCISES.length);
  await expect(page.locator('.paper-image-card img')).toHaveCount(PICTURE_WORDS.length);
  await expect(page.locator('.paper-dialogue')).toHaveCount(PRINT_DIALOGUES.length);
  const toc = await page.locator('[data-paper-target]').evaluateAll(entries => entries.map(entry => {
    const anchor = document.querySelector(`[data-paper-anchor="${entry.dataset.paperTarget}"]`);
    return { target: entry.dataset.paperTarget, page: Number(entry.textContent), actual: Number(anchor.closest('.print-sheet').querySelector('.paper-page-number').textContent.split('/')[0]) };
  }));
  expect(toc).toHaveLength(MODULES.length + 1);
  expect(toc.every(entry => entry.page === entry.actual && entry.page > 2)).toBe(true);
  const pages = page.locator('.print-sheet');
  const progression = await pages.evaluateAll(papers => papers.map(paper => ({
    appendix: paper.dataset.bookKanji === 'true',
    kanji: paper.innerText.match(/[\p{Script=Han}々]/gu) || []
  })));
  const firstKanji = progression.findIndex(paper => paper.appendix);
  expect(firstKanji).toBeGreaterThan(0);
  expect(progression.slice(0, firstKanji).every(paper => paper.kanji.length === 0)).toBe(true);
  expect(progression.slice(firstKanji).every(paper => paper.appendix)).toBe(true);
  const allowed = new Set(BOOK_KANJI.map(item => item.char));
  expect(progression.slice(firstKanji).flatMap(paper => paper.kanji).every(char => allowed.has(char))).toBe(true);
  const colors = await pages.evaluateAll(papers => [...new Set(papers.map(paper => getComputedStyle(paper).getPropertyValue('--paper-accent')))]);
  expect(colors.length).toBeGreaterThanOrEqual(5);
  await page.locator('.print-sheet').first().screenshot({ path: testInfo.outputPath('cover.png') });
  await page.locator('.print-sheet').nth(2).screenshot({ path: testInfo.outputPath('lesson.png') });
  await page.locator('.print-sheet[data-book-kanji]').first().screenshot({ path: testInfo.outputPath('kanji.png') });
  const count = await checkPaper(page, testInfo.outputPath('book.pdf'));
  expect(count).toBeLessThan(120); // Previous layout consumed 150 pages for this content.
  expect(await page.locator('.paper-section-start').evaluateAll(starts => starts.every(start => start.querySelector('[data-book-lesson]') && start.querySelector('[data-book-section]')))).toBe(true);
  await page.locator('#worksheet-answers').uncheck();
  await ready(page);
  await expect(page.locator('.paper-book-answers')).toHaveCount(0);
  expect(await page.locator('.print-sheet').count()).toBeLessThan(count);
  await expect(page.locator('.print-sheet').last()).toHaveAttribute('data-book-kanji', 'true');
  await expect(page.locator('.paper-kanji-answers')).toHaveCount(0);
  expect(await page.locator('.print-sheet:not([data-book-kanji])').evaluateAll(papers => papers.every(paper => !/[\p{Script=Han}々]/u.test(paper.innerText)))).toBe(true);
  await choose(page, '#worksheet-repeat-pages', '2');
  await expect(page.locator('.print-sheet').last()).toHaveAttribute('data-book-kanji', 'true');
});
