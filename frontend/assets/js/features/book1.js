import { BOOK_MODULES as MODULES, BOOK_LESSONS as LESSONS } from "./book-content.js";
import { esc } from "../core/ui.js";
import { exampleRows, bookExplanation, bookPicture, bookPictureHTML } from "./book-visuals.js";

const bookHeader = (title, tone = "teal") => `<header class="paper-header" data-paper-tone="${tone}"><strong>maru.</strong><span>LIVRO 1 · FUNDAMENTOS<br>${esc(title)}</span></header>`;
const cover = `<div class="paper-book-cover"><p class="eyebrow">MARU · LIVRO 1</p><h2>Japonês,<br>passo a passo.</h2><p>Do primeiro som às primeiras conversas: ${MODULES.length} etapas em kana, ${LESSONS.length} lições e atividades para fazer no papel. Dez kanji básicos esperam por você só no final.</p><div class="paper-cover-path"><span>Hiragana</span><span>Katakana</span><span>Frases e conversas</span><span>Kanji no final</span></div><figure class="paper-book-cover-art"><img src="/assets/img/irasutoya-study-nihongo.webp" alt="Pessoa lendo um livro para estudar japonês" width="762" height="800"><figcaption class="paper-art-credit">Ilustração: Mifune Takashi / Irasutoya · www.irasutoya.com</figcaption></figure><p>Nome: __________________________________________</p><small>Esta trilha é introdutória. Não é um curso preparatório oficial nem certificação JLPT. O livro complementa o estudo no site; revisão espaçada, áudio e progresso continuam online.</small></div>`;
const contents = bookHeader("Sumário") + '<h2>Seu caminho neste livro</h2><p class="paper-instructions">Leia a explicação, observe os exemplos e faça os exercícios antes de consultar o gabarito.</p>' +
  `<div class="paper-book-toc">${MODULES.map(module=>`<div><div><strong>${module.number} · ${esc(module.title)}</strong><span>${module.lessons.length} lições · ${esc(module.subtitle)}</span></div><b data-paper-target="module-${module.id}"></b></div>`).join("")}<div><div><strong>Final · Seus primeiros 10 kanji</strong><span>Reconhecer, ler e escrever · depois dos gabaritos</span></div><b data-paper-target="book-kanji"></b></div></div>` +
  `<section class="paper-study-guide"><h3>Uma rotina para aprender no papel</h3><ol><li><strong>Entenda.</strong> Leia uma parte por vez e diga os exemplos em voz alta.</li><li><strong>Experimente.</strong> Cubra os modelos e tente responder de memória.</li><li><strong>Confira.</strong> Compare com o gabarito e corrija o que precisar.</li><li><strong>Retome.</strong> Volte aos pontos difíceis no próximo estudo.</li></ol><p>Conheça um grupo de kana e pratique logo em seguida: vogais, KA/GA, SA/ZA e assim por diante. Cada família tem sua própria folha de escrita. Depois das lições, faça as atividades de vocabulário, frases, partículas, imagens e diálogos. Os gabaritos são opcionais. Só então vêm os dez kanji básicos, na última parte.</p></section>`;
// Examples paginate as whole cards; each section starts with its explanation
// and first example row. Large examples never force an entire lesson to shrink.
const sectionContent = (section, lesson, index, examples = null) => {
  const id = `${lesson.id}:${index}`;
  const rows = examples || exampleRows(section.examples, id);
  return `<section class="paper-book-section" data-book-section="${id}"${section.practiceFamilies ? ` data-practice-families="${section.practiceFamilies.join(' ')}"` : ''}><div class="paper-section-label"><span>${String(index+1).padStart(2,'0')}</span><h3>${esc(section.title)}</h3></div><div class="paper-explanation">${bookExplanation(section.body)}</div>${rows.shift() || ''}</section>` + rows.join('') +
    (section.tip ? `<aside class="paper-book-tip"><strong>Lembrete</strong> ${esc(section.tip)}</aside>` : '');
};
const lessonHeading = (lesson, module, index, compact = false) => {
  const picture = !compact && lesson.sections.flatMap(section=>section.examples).map(bookPicture).find(Boolean);
  return `<div class="paper-section-heading paper-lesson-heading" data-keep-next data-book-lesson="${lesson.id}" ${index===0 ? `data-paper-anchor="module-${module.id}"` : ""}><div><p class="eyebrow">ETAPA ${module.number} · LIÇÃO ${index+1}</p><h2>${esc(lesson.title)}</h2><p class="paper-book-goal">${esc(lesson.goal)}</p><p class="paper-learning-steps">Observe · leia em voz alta · experimente</p></div>${bookPictureHTML(picture)}</div>`;
};
const lessonQuiz = lesson => lesson.quiz.map((question,index)=>`<section class="paper-book-question" data-book-question="${lesson.id}:${index}">${index===0 ? '<h3 class="paper-book-practice-title">Agora é sua vez · marque a alternativa</h3>' : ""}<strong>${index+1}. ${esc(question.prompt)}</strong><div class="paper-book-choices">${question.choices.map((choice,i)=>`<span>□ ${String.fromCharCode(65+i)}) ${esc(choice)}</span>`).join("")}</div></section>`).join("");
const answers = (lessons, start) => bookHeader("Gabarito · lições") + `<h2>Confira suas respostas.</h2>${lessons.map((lesson,index)=>`<section class="paper-book-answers"><h3>${start+index+1}. ${esc(lesson.title)}</h3>${lesson.quiz.map((question,i)=>`<p><strong>${i+1}. ${String.fromCharCode(65+question.answer)} · ${esc(question.choices[question.answer])}</strong> ${esc(question.explanation)}</p>`).join("")}</section>`).join("")}`;

export function book1Pages(writingPages = {}) {
  const pages = [cover, contents];
  for (const module of MODULES) {
    const heading = bookHeader(`${module.number} · ${module.title}`, ["teal", "coral", "violet", "blue", "teal", "coral", "violet"][Number(module.number)-1]);
    let content = '';
    for (const [index, lesson] of module.lessons.entries()) {
      let lead = lessonHeading(lesson,module,index,Boolean(lesson.sections[0].practiceFamilies));
      for (const [sectionIndex, section] of lesson.sections.entries()) {
        const practice = (section.practiceFamilies || []).map(family=>writingPages[module.id]?.[family]).filter(Boolean);
        if (practice.length) {
          // Each family's example and writing grid share one atomic page block.
          // Marked families keep their own example immediately above their grid.
          const rows = exampleRows(section.examples, `${lesson.id}:${sectionIndex}`);
          for (const [familyIndex, writing] of practice.entries()) {
            const intro = familyIndex===0 ? sectionContent(section,lesson,sectionIndex,[rows[familyIndex]]) : rows[familyIndex];
            content += `<div class="paper-kana-study">${lead}${intro}<p class="paper-instructions">Observe os traços numerados, cubra os modelos claros e escreva nos blocos vazios.</p>${writing}</div>`;
            lead = '';
          }
        } else content += lead + sectionContent(section,lesson,sectionIndex);
        lead = '';
      }
      content += lessonQuiz(lesson);
    }
    if (content) pages.push(heading + content);
  }
  const answerPages = [answers(LESSONS,0)];
  return { pages, answerPages };
}
