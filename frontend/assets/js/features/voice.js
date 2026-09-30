// Prepara a voz de uma rodada antes de liberar a resposta.
// Estados: loading, ready, waiting (429: tenta de novo sozinho no fim da contagem) e failed.
// Com a voz pronta, a da próxima rodada é pedida em segundo plano; uma falha ali é silenciosa.
export function createVoiceGate(ctx, onChange) {
  let token = 0, timer = null, retryAt = 0, state = 'idle', text = '', upcoming = '';
  const clear = () => { clearInterval(timer); timer = null; };
  const set = value => { state = value; onChange(value); };
  async function load(nextText = text, nextUpcoming = '') {
    const request = ++token; clear();
    text = nextText; upcoming = nextUpcoming;
    set('loading');
    try { await ctx.audio.preload(text); }
    catch (error) {
      if (request !== token) return;
      if (error.status === 429) {
        retryAt = Date.now() + Math.max(1, error.retryAfter || 15) * 1000;
        set('waiting');
        timer = setInterval(() => { if (Date.now() >= retryAt) load(text, upcoming); else onChange('waiting'); }, 250);
      } else set('failed');
      return;
    }
    if (request !== token) return;
    set('ready');
    if (upcoming && upcoming !== text) ctx.audio.preload(upcoming).catch(() => {});
  }
  return {
    load,
    retry: () => load(text, upcoming),
    cancel() { token++; clear(); state = 'idle'; },
    get state() { return state; },
    secondsLeft: () => Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
  };
}
