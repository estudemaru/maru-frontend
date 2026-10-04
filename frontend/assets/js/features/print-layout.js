// Measure at physical A4 size. Preview scaling never changes the typesetting.
const INTRO = '.paper-header, .paper-name, h2, .paper-instructions, .paper-book-goal, .eyebrow';

function createPage(preview, heading, continuation, lessonTitle = "", showContinuation = true) {
  const frame = document.createElement('div');
  frame.className = 'paper-preview-page';
  const page = document.createElement('article');
  page.className = 'print-sheet';
  const sourceHeader = heading.find(node => node.matches('.paper-header'));
  page.dataset.paperTone = sourceHeader?.dataset.paperTone || 'teal';
  if (sourceHeader?.hasAttribute('data-book-kanji')) page.dataset.bookKanji = 'true';
  const head = document.createElement('div');
  head.className = 'paper-heading';
  heading.filter(node => !continuation || node.matches('.paper-header')).forEach(node => head.append(node.cloneNode(true)));
  if (continuation && showContinuation) {
    const label = document.createElement('p');
    label.className = 'paper-continuation';
    label.textContent = [lessonTitle || heading.find(node => node.matches('h2'))?.textContent, 'continuação'].filter(Boolean).join(' · ');
    head.append(label);
  }
  const body = document.createElement('div');
  body.className = 'paper-body';
  const footer = document.createElement('footer');
  footer.className = 'paper-footer';
  footer.innerHTML = '<span>maru. · Japonês, passo a passo</span><span class="paper-page-number"></span>';
  page.append(head, body, footer);
  frame.append(page);
  preview.append(frame);
  return { page, body, footer };
}

const fits = body => {
  const bounds = body.getBoundingClientRect();
  const bottom = body.lastElementChild?.getBoundingClientRect().bottom || bounds.top;
  return body.scrollHeight <= body.clientHeight && bottom <= bounds.bottom + .25;
};
// Section titles travel with their first exercise or explanation.
function contentBlocks(nodes) {
  const blocks = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (node.matches('.paper-answer')) {
      const row = document.createElement('div');
      row.className = 'paper-answer-pair';
      row.append(node);
      if (nodes[index + 1]?.matches('.paper-answer')) row.append(nodes[++index]);
      blocks.push(row);
    } else if (node.matches('[data-keep-next]') && nodes[index + 1]) {
      const group = document.createElement('div');
      group.className = 'paper-section-start';
      group.append(node, nodes[++index]);
      blocks.push(group);
    } else blocks.push(node);
  }
  return blocks;
}

// A measured source may span several pages, but questions and writing rows
// remain atomic. Never shrink the whole page or silently clip overflowing text.
export async function renderPrintPages(preview, sheets, isCurrent) {
  preview.style.setProperty('--paper-scale', '1');
  preview.dataset.ready = 'false';
  preview.innerHTML = sheets.map(html => `<div class="print-sheet paper-source">${html}</div>`).join('');
  await document.fonts.ready;
  await Promise.all([...preview.querySelectorAll('img')].map(image => image.decode()));
  if (!isCurrent()) return null;
  const sources = [...preview.children].map(source => [...source.children]);
  preview.replaceChildren();
  const pages = [];
  for (const nodes of sources) {
    const heading = [];
    while (nodes[0]?.matches(INTRO)) heading.push(nodes.shift());
    let current = createPage(preview, heading, false);
    pages.push(current);
    let lessonTitle = "";
    for (const node of contentBlocks(nodes)) {
      lessonTitle = node.querySelector("[data-book-lesson] h2")?.textContent || lessonTitle;
      current.body.append(node);
      const families = current.body.querySelectorAll('.paper-kana-family');
      if (!fits(current.body) || families.length > 1) {
        node.remove();
        if (!current.body.childElementCount) throw new Error('Um bloco de conteúdo excede a área A4.');
        const hasOwnHeading = node.matches('.paper-kana-study') || node.querySelector('[data-book-lesson]');
        current = createPage(preview, heading, true, lessonTitle, !hasOwnHeading);
        pages.push(current);
        current.body.append(node);
        if (!fits(current.body)) throw new Error('Um bloco de conteúdo excede a área A4.');
      }
    }
  }
  for (const [index, { page, body, footer }] of pages.entries()) {
    if (body.querySelector('.paper-book-cover')) body.classList.add('paper-body-cover');
    if (body.querySelector('.paper-learning-image')) footer.firstElementChild.innerHTML += '<small>Ilustrações: Mifune Takashi / Irasutoya</small>';
    if (body.querySelector('.model svg')) footer.firstElementChild.innerHTML += '<small>Traços: KanjiVG · Ulrich Apel e colaboradores · CC BY-SA 3.0</small>';
    footer.querySelector('.paper-page-number').textContent = `${index + 1} / ${pages.length}`;
    page.setAttribute('aria-label', `Folha ${index + 1} de ${pages.length}`);
    if (!fits(body)) throw new Error('Não foi possível ajustar esta folha ao A4.');
  }
  // Reserve the number column in CSS so resolving the contents cannot reflow it.
  for (const entry of preview.querySelectorAll('[data-paper-target]')) {
    const index = pages.findIndex(({ body }) => [...body.querySelectorAll('[data-paper-anchor]')].some(node => node.dataset.paperAnchor === entry.dataset.paperTarget));
    entry.textContent = index < 0 ? '—' : String(index + 1);
  }
  preview.dataset.ready = 'true';
  return pages.length;
}

export function scalePrintPreview(preview) {
  const resize = () => {
    const paper = preview.querySelector('.paper-preview-page[data-current] .print-sheet') || preview.querySelector('.print-sheet');
    if (!paper) return;
    const width = paper.offsetWidth;
    if (!width) return;
    preview.style.setProperty('--paper-scale', String(Math.min(1, preview.clientWidth / width)));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(preview);
  return { resize, disconnect: () => observer.disconnect() };
}
