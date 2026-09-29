import { KANA } from '../../../../shared/content.js';

// Printed lessons introduce one related group, then immediately practise it.
// The source curriculum stays available unchanged in the online course.
const groups = [['a'], ['ka', 'ga'], ['sa', 'za'], ['ta', 'da'], ['na'], ['ha', 'ba', 'pa'], ['ma'], ['ya'], ['ra'], ['wa']];
const notes = {
  a: 'Comece pelas cinco vogais: a, i, u, e, o. Observe as formas, diga os sons e depois pratique nos blocos.',
  ka: 'Leia KA, KI, KU, KE, KO. As duas pequenas marcas, chamadas dakuten, transformam a família K em G. Compare as duas fileiras antes de escrever.',
  sa: 'Nesta família, preste atenção a SHI. Com dakuten, a família S passa a Z; SHI passa a JI. Diga os sons e compare as formas.',
  ta: 'Preste atenção a CHI e TSU. Com dakuten, a fileira se lê DA, JI, ZU, DE, DO. JI e ZU desta fileira têm grafias próprias: não troque pelas da família ZA.',
  na: 'Leia NA, NI, NU, NE, NO, seguindo a ordem das vogais. Observe o que muda de um caractere para o outro.',
  ha: 'Leia HA, HI, FU, HE, HO. Em FU, solte um sopro suave pelos lábios. O dakuten muda H para B; o pequeno círculo, chamado handakuten, muda H para P.',
  ma: 'Leia MA, MI, MU, ME, MO. Diga cada som enquanto observa a forma; depois cubra o modelo e tente escrever.',
  ya: 'Esta família tem três caracteres: YA, YU e YO. Aqui, eles aparecem em tamanho normal. As combinações com caracteres pequenos vêm depois.',
  ra: 'Leia RA, RI, RU, RE, RO. O r é breve, próximo ao toque da língua em “caro”. Observe os traços antes de repetir.',
  wa: 'WA, WO e N encerram a tabela básica. WO costuma ser pronunciado o quando usado como partícula. N é um som nasal: não acrescente uma vogal depois dele.'
};

function familySection(script, families, originalExamples = []) {
  const base = families[0];
  const label = base === 'a' ? 'as vogais' : base === 'wa' ? 'WA, WO e N' : `${families.length>1 ? 'as famílias' : 'a família'} ${families.map(id=>id.toUpperCase()).join(' / ')}`;
  return {
    title: `Conheça ${label}`,
    body: (script==='katakana' && base==='a' ? 'Katakana tem 46 caracteres básicos e representa os mesmos sons do hiragana, com outras formas. ' : '') + notes[base],
    practiceFamilies: families,
    examples: families.map(family => {
      const items = KANA.filter(item=>item.script===script && (item.row===family || (family==='wa' && item.row==='n')));
      const jp = items.map(item=>item.char).join('　');
      return originalExamples.find(example=>example.jp===jp) || {
        jp, reading: '', romaji: items.map(item=>item.romaji==='wo' ? 'o (wo)' : item.romaji).join(' · '),
        pt: family==='a' ? 'As cinco vogais' : family==='wa' ? 'Fim da tabela básica' : `Família ${family.toUpperCase()}`
      };
    })
  };
}

export function interleaveKanaLesson(lesson) {
  const examples = lesson.sections.flatMap(section=>section.examples);
  if (lesson.id === 'h-vowels') return { ...lesson, sections: lesson.sections.map((section,index)=>index===0 ? {...section, practiceFamilies:['a']} : section) };
  if (lesson.id === 'h-rows') return { ...lesson, title: 'Conheça e escreva: KA até PA', goal: 'Aprender uma família de cada vez e praticar sua escrita logo em seguida.', sections: [
    ...groups.slice(1,6).map(families=>familySection('hiragana',families,examples)),
    {...lesson.sections[1], title:'Junte os sons que você praticou', body:'Agora leia duas palavras com caracteres dessas famílias. Diga cada som e depois junte a palavra inteira.', examples:lesson.sections[1].examples.slice(2)}
  ] };
  if (lesson.id === 'h-rest') return { ...lesson, sections: [
    ...groups.slice(6).map(families=>familySection('hiragana',families,examples)),
    {...lesson.sections[1], title:'Leia mais duas palavras', body:'Você completou as 46 formas básicas e também praticou as famílias com marcas. Junte os sons nas palavras abaixo.', examples:lesson.sections[1].examples.slice(1), tip:'São 46 caracteres básicos. As formas com dakuten e handakuten ampliam a tabela; não são 71 básicos.'}
  ] };
  if (lesson.id === 'k-basics') return { ...lesson, goal:'Conhecer cada família do katakana e praticar sua escrita antes de avançar.', sections: [
    ...groups.map(families=>familySection('katakana',families,examples)),
    lesson.sections[1]
  ] };
  return lesson;
}
