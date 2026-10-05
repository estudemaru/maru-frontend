import { test, expect } from '@playwright/test';
import { KANA } from '../../shared/content.js';
import { BEGINNER_KANJI, SENTENCES } from '../../shared/catalog.js';
import { BOOK_MODULES as MODULES, BOOK_LESSONS as LESSONS, BOOK_KANJI, BOOK_KANA_ORDER } from '../../frontend/assets/js/features/book-content.js';
import { VOCABULARY, VOCABULARY_GROUPS } from '../../shared/vocabulary.js';
import { PARTICLE_EXERCISES } from '../../shared/exercises.js';
import { PICTURE_WORDS, PRINT_DIALOGUES } from '../../shared/printActivities.js';

const ready = async page => {
  await expect(page.locator('#worksheet-preview')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#print-worksheet')).toBeEnabled();
};
const choose = async (page, selector, value) => {
  const options = page.locator('.worksheet-options');
  if (await options.locator(selector).count() && !await options.evaluate(element => element.open)) {
    await options.locator('summary').click();
  }
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
  await expect(page.locator('.paper-row[data-print-char]')).toHaveCount(5);
  await expect(page.locator('.print-sheet')).toHaveCount(1);
  await expect(page.locator('.worksheet-char')).toHaveCount(5);
  await expect(page.locator('.worksheet-options')).not.toHaveAttribute('open', '');
  await expect(page.locator('#worksheet-page-position')).toHaveText('Folha 1 de 1');
  await choose(page, '#worksheet-family', 'ka');
  await expect(page.locator('.paper-kana-family')).toHaveAttribute('data-family', 'ka');
  await expect(page.locator('.paper-row[data-print-char]')).toHaveCount(5);
  await expect(page.locator('.worksheet-char')).toHaveCount(5);
  await choose(page, '#worksheet-family', 'a');
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
  await expect(page.locator('.paper-preview-page:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'Próxima folha' }).click();
  await expect(page.locator('#worksheet-page-position')).toHaveText('Folha 2 de 3');
  await expect(page.locator('.paper-preview-page:visible .paper-repeat-grid')).toHaveCount(1);
  await page.getByRole('button', { name: 'Próxima folha' }).click();
  await expect(page.locator('#worksheet-next')).toBeDisabled();
  await page.getByRole('button', { name: 'Folha anterior' }).click();
  // Mesmo com a segunda folha na prévia, o PDF contém as três páginas.
  await checkPaper(page);
  await expect(page.locator('.paper-preview-page:visible')).toHaveCount(1);
  await expect(page.locator('#worksheet-page-position')).toHaveText('Folha 2 de 3');
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('#print-worksheet').click();
  await expect.poll(() => page.evaluate(() => window.printCalls)).toBe(1);
});

test('all selected characters keep their families on separate A4 pages in both themes', async ({ page }) => {
  await page.goto('/#/worksheets');
  await ready(page);
  await choose(page, '#worksheet-script', 'all');
  await choose(page, '#worksheet-scope', 'all');
  const expected = [...['hiragana', 'katakana'].flatMap(script => BOOK_KANA_ORDER.flatMap(family => KANA.filter(item => item.script === script && (item.row === family || (family === 'wa' && item.row === 'n'))))), ...BEGINNER_KANJI].map(item => item.char);
  expect(await page.locator('.paper-row[data-print-char]').evaluateAll(rows => rows.map(row => row.dataset.printChar))).toEqual(expected);
  await expect(page.locator('.paper-kana-family')).toHaveCount(30);
  expect(await page.locator('.print-sheet:has(.paper-kana-family)').evaluateAll(papers => papers.every(paper => paper.querySelectorAll('.paper-kana-family').length === 1))).toBe(true);
  await expect(page.locator('.paper-row[data-print-char="を"]')).toContainText('wo/o');
  for (const theme of ['dojo', 'arcade']) {
    // O CSS do tema depende só de html[data-theme]; vale para os fontes e para o build.
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    await ready(page);
    await expect(page.locator('.print-sheet').first()).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await checkPaper(page);
  }
});

test('monochrome printing keeps dark text, visible tracing models and isolated selected families', async ({ page }, testInfo) => {
  await page.goto('/#/worksheets');
  await ready(page);
  await choose(page, '#worksheet-script', 'katakana');
  await choose(page, '#worksheet-scope', 'all');
  await checkPaper(page, testInfo.outputPath('katakana.pdf'));
  await choose(page, '#worksheet-color', 'mono');
  await expect(page.locator('#worksheet-preview')).toHaveAttribute('data-print-color', 'mono');
  await expect(page.locator('.print-sheet')).toHaveCount(15);
  await expect(page.locator('.paper-header strong').first()).toHaveCSS('color', 'rgb(17, 17, 17)');
  await expect(page.locator('.paper-box.model path').first()).toHaveCSS('stroke', 'rgb(17, 17, 17)');
  await expect(page.locator('.paper-box.ghost path').first()).toHaveCSS('stroke', 'rgb(136, 136, 136)');
  await expect(page.locator('.paper-family-overview').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.locator('.print-sheet').first().screenshot({ path: testInfo.outputPath('katakana-mono.png') });
  await checkPaper(page, testInfo.outputPath('katakana-mono.pdf'));
  await choose(page, '#worksheet-scope', 'one');
  await choose(page, '#worksheet-scope', 'custom');
  for (const char of ['カ', 'ガ']) await page.locator(`.worksheet-char[data-print-char="${char}"]`).click();
  await ready(page);
  await expect(page.locator('.print-sheet')).toHaveCount(3);
  expect(await page.locator('.paper-kana-family').evaluateAll(groups => groups.map(group => group.dataset.family))).toEqual(['a', 'ka', 'ga']);
  await checkPaper(page);
  await choose(page, '#worksheet-color', 'color');
  await expect(page.locator('.paper-header strong').first()).toHaveCSS('color', 'rgb(20, 107, 112)');
});
