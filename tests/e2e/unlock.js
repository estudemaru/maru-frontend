// Progresso inicial para os testes, gravado antes de o app abrir (só numa aba sem progresso).
export const seedProgress = (page, state) => page.addInitScript(value => {
  if (!localStorage.getItem('maru-learning-v2')) localStorage.setItem('maru-learning-v2', JSON.stringify(value));
}, state);
// A trilha abre uma unidade por vez. Testes que exercitam uma lição específica começam
// com todas as unidades abertas pelo diagnóstico (aceito na unidade 14), sem lições concluídas.
export const unlockTrail = page => seedProgress(page, { placement: { acceptedModule: 'te-form', updatedAt: 1 } });
// Só a unidade 0 lida: o hiragana é a próxima parada.
export const startHiragana = page => seedProgress(page, { lessons: Object.fromEntries(['welcome', 'sounds', 'start-study'].map(id => [id, { completedAt: 1, score: 3 }])) });
