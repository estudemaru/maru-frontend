// Prefer a Japanese voice on the device to avoid a synthesis request per click.
export function createBrowserSpeech({ synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, startTimeout = 2500 } = {}) {
  let active = null, unavailable = false;
  function japaneseVoice() {
    if (!synthesis || !Utterance || unavailable) return null;
    try {
      const voices = synthesis.getVoices().filter(voice => /^ja(?:[-_]|$)/i.test(voice.lang));
      return voices.find(voice => voice.localService) || voices.find(voice => voice.default) || voices[0] || null;
    } catch { return null; }
  }
  // Query immediately so browsers that load voices asynchronously can warm up.
  japaneseVoice();
  synthesis?.addEventListener?.("voiceschanged", () => { unavailable = false; japaneseVoice(); });

  function release(session) {
    clearTimeout(session.timer);
    session.utterance.onstart = session.utterance.onend = session.utterance.onerror = null;
    if (active === session) active = null;
  }
  function stop() {
    if (!active) return;
    const session = active;
    release(session);
    session.resolve(false);
    try { synthesis.cancel(); } catch {}
  }
  function speak(text, { rate = 1, onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}) {
    stop();
    const voice = japaneseVoice();
    if (!voice) return Promise.reject(new Error("Voz japonesa indisponível neste aparelho."));
    return new Promise((resolve, reject) => {
      const utterance = new Utterance(text);
      const session = { utterance, resolve, started: false, timer: null };
      active = session;
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      const fail = event => {
        if (active !== session) return;
        const code = event.error || "synthesis-failed";
        const error = Object.assign(new Error("Não foi possível reproduzir a voz deste aparelho."), {
          name: code === "not-allowed" ? "NotAllowedError" : ["canceled", "interrupted"].includes(code) ? "AbortError" : "Error"
        });
        if (error.name === "Error") unavailable = true;
        release(session);
        try { synthesis.cancel(); } catch {}
        if (session.started) onError(error);
        else reject(error);
      };
      utterance.onstart = () => {
        if (active !== session) return;
        session.started = true; clearTimeout(session.timer);
        onStart(); resolve(true);
      };
      utterance.onend = () => {
        if (active !== session) return;
        if (!session.started) return fail({ error: "synthesis-failed" });
        release(session); onEnd();
      };
      utterance.onerror = fail;
      session.timer = setTimeout(() => fail({ error: "synthesis-unavailable" }), startTimeout);
      try {
        if (synthesis.paused) synthesis.resume();
        synthesis.speak(utterance);
      } catch (error) { fail({ error: error.name === "NotAllowedError" ? "not-allowed" : "synthesis-failed" }); }
    });
  }
  return { hasVoice: () => Boolean(japaneseVoice()), speak, stop };
}
