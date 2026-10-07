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
