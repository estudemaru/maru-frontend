import { getTheme } from '/shared/curriculum.js';
import { katakanaCleared } from '/shared/learningPath.js';

// Kana firme: 80% das lições de hiragana e de katakana, ou a unidade do katakana já
// vencida. Sem isso, o modo de leitura troca kanji por kana nas telas.
export const hasKanaFoundation = progress => katakanaCleared(progress) || ['hiragana','katakana'].every(id => {
  const lessons = getTheme(id).lessons;
  return lessons.filter(lesson=>progress.lessons[lesson.id]?.completedAt).length / lessons.length >= .8;
});
