// One catalogue connects the sidebar, hub cards and breadcrumbs.
export const NAVIGATION = [
  { route: "home", icon: "home", title: "Início" },
  { route: "journey", icon: "path", title: "Minha trilha" },
  { route: "practice", icon: "target", title: "Arcade" },
  { route: "progress", icon: "spark", title: "Meu desempenho" },
  { route: "worksheets", icon: "pen", title: "Papel e lápis" },
  { route: "explore", icon: "book", title: "Consultar" }
];
export const PRACTICE_TOOLS = [
  { route: "challenge", icon: "clock", title: "Desafios de repetição", description: "Escreva kana e frases em rodadas curtas, com tempo ou no seu ritmo. Descubra o que revisar.", detail: "Começar pelas vogais", color: "lavender" },
  { route: "exercises", icon: "volume", title: "Exercícios e escuta", description: "Reconheça os sons, escolha palavras e pratique partículas com explicações a cada resposta.", detail: "Ouvir e responder", color: "sage" },
  { route: "writing", icon: "pen", title: "Caderno de escrita", description: "Comece por あ, acompanhe os traços e repita à mão. Os kanji ficam para depois dos kana.", detail: "Ver e desenhar", color: "peach" },
  { route: "sentences", icon: "chat", title: "Transcrever frases", description: "Leia a frase em japonês e copie os caracteres, sem romaji.", detail: "Montar e entender", color: "sky" }
];
export const RESOURCE_GROUPS = [
  { id: "basics", title: "Fundamentos", description: "Consulte a base do idioma no seu ritmo." },
  { id: "culture", title: "Cultura e situações", description: "Encontre o japonês nas coisas que fazem parte da sua vida." },
  { id: "materials", title: "Materiais de apoio", description: "Tire dúvidas, conheça outras fontes e leve a escrita para o papel." }
];
const ALL_RESOURCES = [
  { route: "videos", group: "materials", icon: "volume", title: "Aulas gratuitas", description: "Mais de 100 aulas no YouTube, do 123 Japonês, Nihongando com Nanda, JapanesePod101 e outros, organizadas pelas lições.", keywords: "youtube aula video online professor 123 japones nanda nihongando japanesepod101 101 programa japones online", color: "sage" },
  { route: "kana", group: "basics", icon: "あ", title: "Hiragana e katakana", description: "As duas tabelas de kana, com sons, combinações e prática.", keywords: "alfabeto vogais silabas letras leitura", color: "sage" },
  { route: "kanji", group: "basics", icon: "日", title: "Primeiros kanji", description: "Significados, leituras e exemplos dos seus primeiros caracteres.", keywords: "ideogramas simbolos", color: "sand" },
  { route: "vocabulary", group: "basics", icon: "book", title: "Primeiras palavras", description: "Vocabulário do cotidiano com pronúncia e frases de exemplo.", keywords: "vocabulario dicionario", color: "sky" },
  { route: "particles", group: "basics", icon: "layers", title: "Partículas", description: "Entenda como as pequenas palavras conectam uma frase.", keywords: "gramatica wa ga ni de wo ha", color: "lavender" },
  { route: "expressions", group: "culture", icon: "spark", title: "Expressões e gírias", description: "O que as pessoas dizem, em que contexto e com quem usar.", keywords: "jargoes giria informal conversa cumprimentos", color: "peach" },
  { route: "themes", group: "culture", icon: "path", title: "Trilhas temáticas", description: "Japonês para viagem, anime, mangá e situações de trabalho.", keywords: "cultura turismo emprego", color: "sage" },
  { route: "glossary", group: "materials", icon: "chat", title: "Explicado do zero", description: "Um glossário simples para os termos que aparecem nas lições.", keywords: "glossario duvidas conceitos ajuda", color: "lavender" },
  { route: "worksheets", group: "materials", icon: "pen", title: "Atividades para imprimir", description: "Folhas A4 para treinar escrita, palavras e frases à mão.", keywords: "pdf impressao papel caligrafia vogais", color: "peach" },
  { route: "teacher", group: "materials", icon: "path", title: "Para professores", description: "Escolha uma etapa ou tema e compartilhe um pacote de estudo com sua turma.", keywords: "professor professora aula turma livro material", color: "sage" },
  { route: "library", group: "materials", icon: "external", title: "Biblioteca", description: "Fontes e recursos selecionados para continuar descobrindo.", keywords: "referencias sites livros materiais", color: "sky" }
];
export const RESOURCES = ALL_RESOURCES.filter(item => !["themes", "teacher"].includes(item.route)).map(item => item.route === "worksheets" ? { ...item, title: "Folhas de repetição", description: "Modelos e quadrados para repetir caracteres à mão." } : item);
const pages = [
  { route: "arcade", title: "Jogar", section: "practice" },
  { route: "daily", title: "Desafio do dia", section: "practice" },
  ...NAVIGATION.map(item => ({ ...item, section: item.route })),
  ...PRACTICE_TOOLS.map(item => ({ ...item, section: "practice" })),
  ...RESOURCES.map(item => ({ ...item, section: "explore" })),
  { route: "lesson", title: "Lição", section: "journey" },
  { route: "review", title: "Minha revisão", section: "progress" },
  { route: "package", title: "Pacote de estudo", section: "teacher" },
  { route: "placement", title: "Encontre seu começo", section: "journey" },
  { route: "settings", title: "Meu ritmo", section: "settings" },
  { route: "account", title: "Minha conta", section: "account" },
];
export function navigationFor(route) {
  return pages.find(item => item.route === route) || { title: "Página não encontrada", section: "" };
}
