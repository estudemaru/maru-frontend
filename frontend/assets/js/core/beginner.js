import { getTheme } from '/shared/curriculum.js';

export const hasKanaFoundation = progress => ['hiragana','katakana'].every(id => {
  const lessons = getTheme(id).lessons;
  return lessons.filter(lesson=>progress.lessons[lesson.id]?.completedAt).length / lessons.length >= .8;
});
