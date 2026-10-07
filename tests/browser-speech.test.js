import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserSpeech } from "../frontend/assets/js/core/browserSpeech.js";

const local = { name: "Kyoko", lang: "ja-JP", localService: true };
const remote = { name: "Japanese", lang: "ja-JP", localService: false };
const portuguese = { name: "Português", lang: "pt-BR", localService: true, default: true };
class Utterance { constructor(text) { this.text = text; } }
class Synthesis extends EventTarget {
  constructor(voices = [portuguese, remote, local]) { super(); this.voices = voices; this.calls = []; this.canceled = 0; this.resumed = 0; }
  getVoices() { return this.voices; }
  speak(utterance) { this.calls.push(utterance); }
  cancel() { this.canceled++; }
  resume() { this.paused = false; this.resumed++; }
}
const controller = (synthesis, options = {}) => createBrowserSpeech({ synthesis, Utterance, ...options });

test("Firefox on macOS bypasses native speech even with Kyoko available or voices arriving later", async () => {
  for (const userAgent of [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:156.0) Gecko/20100101 Firefox/156.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:130.0) Gecko/20100101 Firefox/130.0"
  ]) {
    const synthesis = new Synthesis();
    synthesis.getVoices = () => { throw new Error("The affected native pipeline must stay unused"); };
    const speech = controller(synthesis, { userAgent });
    assert.equal(speech.hasVoice(), false);
    synthesis.dispatchEvent(new Event("voiceschanged"));
    assert.equal(speech.hasVoice(), false);
    await assert.rejects(speech.speak("こんにちは"));
    speech.stop();
    assert.equal(synthesis.calls.length, 0);
    assert.equal(synthesis.canceled, 0);
  }
});

test("the macOS Firefox workaround preserves system speech on other browsers and platforms", async () => {
  for (const userAgent of [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/26.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:156.0) Gecko/20100101 Firefox/156.0",
    "Mozilla/5.0 (X11; Linux x86_64; rv:156.0) Gecko/20100101 Firefox/156.0",
    "Mozilla/5.0 (Android 16; Mobile; rv:156.0) Gecko/156.0 Firefox/156.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 FxiOS/146.0 Mobile/15E148 Safari/605.1.15"
  ]) {
    const synthesis = new Synthesis();
    const speech = controller(synthesis, { userAgent });
    assert.equal(speech.hasVoice(), true, userAgent);
    const played = speech.speak("こんにちは");
    synthesis.calls[0].onstart();
    assert.equal(await played, true);
    synthesis.calls[0].onend();
  }
});

test("Japanese system speech starts with the local voice and chosen speed", async () => {
  const synthesis = new Synthesis(); synthesis.paused = true;
  const speech = controller(synthesis);
  const events = [];
  const played = speech.speak("みず", { rate: .75, onStart: () => events.push("start"), onEnd: () => events.push("end") });
  const utterance = synthesis.calls[0];
  assert.equal(utterance.voice, local);
  assert.equal(utterance.lang, "ja-JP");
  assert.equal(utterance.rate, .75);
  assert.equal(utterance.text, "みず");
  assert.equal(synthesis.resumed, 1);
  utterance.onstart();
  assert.equal(await played, true);
  utterance.onend();
  assert.deepEqual(events, ["start", "end"]);
  assert.equal(utterance.onstart, null);
  assert.equal(synthesis.canceled, 0, 'terminar naturalmente não cancela nem reinicia o motor de voz');
});

test("Japanese reading voices take priority over the Eloquence voices listed first on macOS", async () => {
  const synthesis = new Synthesis([
    { name: "Eddy (japonês (Japão))", lang: "ja-JP", localService: true },
    { name: "Grandma (japonês (Japão))", lang: "ja-JP", localService: true, default: true },
    local
  ]);
  const speech = controller(synthesis);
  const played = speech.speak("こんにちは");
  const utterance = synthesis.calls[0];
  assert.equal(utterance.voice, local);
  utterance.onstart(); await played; utterance.onend();
  assert.equal(synthesis.canceled, 0);
});

test("unfamiliar Japanese reading voices remain usable but Eloquence voices fall back to remote speech", () => {
  const character = { name: "Flo (japonês (Japão))", lang: "ja-JP", localService: true };
  const synthesis = new Synthesis([character, remote]);
  const speech = controller(synthesis);
  assert.equal(speech.hasVoice(), true);
  const playing = speech.speak("こんにちは");
  assert.equal(synthesis.calls[0].voice, remote);
  synthesis.calls[0].onstart();
  synthesis.calls[0].onend();
  synthesis.voices = [character];
  assert.equal(speech.hasVoice(), false);
  return playing;
});

test("Safari Eloquence identifiers are excluded even when their visible names are localized", async () => {
  const synthesis = new Synthesis([{ name: "日本語の声", voiceURI: "com.apple.eloquence.ja-JP.Eddy", lang: "ja-JP", localService: true }, local]);
  const speech = controller(synthesis);
  const played = speech.speak("みず");
  assert.equal(synthesis.calls[0].voice, local);
  synthesis.calls[0].onstart();
  await played;
  synthesis.calls[0].onend();
});

test("a remote Japanese voice is usable but a Portuguese default is never used for Japanese", async () => {
  const synthesis = new Synthesis([portuguese, remote]);
  const speech = controller(synthesis);
  assert.equal(speech.hasVoice(), true);
  const played = speech.speak("こんにちは");
  const utterance = synthesis.calls[0];
  assert.equal(utterance.voice, remote);
  utterance.onstart(); await played; utterance.onend();
  synthesis.voices = [portuguese];
  assert.equal(speech.hasVoice(), false);
  await assert.rejects(speech.speak("こんにちは"));
  assert.equal(synthesis.calls.length, 1);
});

test("late-loaded voices and devices without speech synthesis are handled", () => {
  const synthesis = new Synthesis([]);
  const speech = controller(synthesis);
  assert.equal(speech.hasVoice(), false);
  synthesis.voices = [{ ...local, lang: "ja_JP" }];
  synthesis.dispatchEvent(new Event("voiceschanged"));
  assert.equal(speech.hasVoice(), true);
  assert.equal(createBrowserSpeech({ synthesis: null, Utterance: null }).hasVoice(), false);
});

test("stop settles a waiting playback even when cancel emits no event", async () => {
  const synthesis = new Synthesis();
  const speech = controller(synthesis);
  let started = false;
  const played = speech.speak("みず", { onStart: () => { started = true; } });
  const lateStart = synthesis.calls[0].onstart;
  speech.stop();
  assert.equal(await played, false);
  lateStart();
  assert.equal(started, false);
  assert.equal(synthesis.canceled, 1);
  speech.stop();
  assert.equal(synthesis.canceled, 1);
});

test("starting another word cancels the old utterance and does not leave it queued", async () => {
  const synthesis = new Synthesis();
  const speech = controller(synthesis);
  const first = speech.speak("みず");
  const second = speech.speak("ねこ");
  assert.equal(await first, false);
  assert.equal(synthesis.canceled, 1);
  assert.equal(synthesis.calls[0].onstart, null);
  synthesis.calls[1].onstart();
  assert.equal(await second, true);
  synthesis.calls[1].onend();
});

test("failed and stalled voices become unavailable so the player can use the remote alternative", async () => {
  for (const mode of ["error", "timeout"]) {
    const synthesis = new Synthesis();
    const speech = controller(synthesis, { startTimeout: 15 });
    const played = speech.speak("みず");
    if (mode === "error") synthesis.calls[0].onerror({ error: "voice-unavailable" });
    await assert.rejects(played, error => error.name === "Error");
    assert.equal(speech.hasVoice(), false);
    assert.equal(synthesis.canceled, 1);
    synthesis.dispatchEvent(new Event("voiceschanged"));
    assert.equal(speech.hasVoice(), true);
  }
});

test("autoplay denial keeps the voice available for the next explicit click", async () => {
  const synthesis = new Synthesis();
  const speech = controller(synthesis);
  const played = speech.speak("こんにちは");
  synthesis.calls[0].onerror({ error: "not-allowed" });
  await assert.rejects(played, error => error.name === "NotAllowedError");
  assert.equal(speech.hasVoice(), true);
});

test("an error after speech starts releases the utterance and reports the interruption", async () => {
  const synthesis = new Synthesis();
  const speech = controller(synthesis);
  const errors = [];
  const played = speech.speak("みず", { onError: error => errors.push(error.name) });
  const utterance = synthesis.calls[0];
  utterance.onstart(); await played;
  utterance.onerror({ error: "synthesis-failed" });
  assert.deepEqual(errors, ["Error"]);
  assert.equal(speech.hasVoice(), false);
  assert.equal(utterance.onerror, null);
});
