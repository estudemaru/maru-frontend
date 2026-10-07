import { audioKey } from "/shared/audioText.js";
import { getPronunciation } from "/shared/pronunciation.js";
import { createBrowserSpeech } from "./browserSpeech.js";

export function createAudio(toast, preferences = () => ({})) {
  let sequence = 0, media = null, activeButton = null, requestController = null, effectContext = null, playbackTimer = null;
  const cache = new Map();
  const browserSpeech = createBrowserSpeech();
  const mark = (button, state) => {
    if (!button) return;
    button.classList.toggle("is-loading", state === "loading");
    button.classList.toggle("is-playing", state === "playing");
    button.setAttribute("aria-busy", String(state === "loading"));
    button.setAttribute("aria-pressed", String(state === "playing"));
  };
  function stop() {
    sequence++;
    requestController?.abort(); requestController = null;
    clearTimeout(playbackTimer); playbackTimer = null;
    browserSpeech.stop();
    if (media) { media.pause(); media.removeAttribute("src"); media.load(); media = null; }
    mark(activeButton, "idle"); activeButton = null;
  }
  const pending = new Map();
  // Erros levam status e retryAfter (segundos) para quem precisa esperar o 429 da API de voz.
  async function request(text, signal) {
    const response=await fetch("/api/audio",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({text}),signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(data.error || "A pronúncia está indisponível. Tente novamente."),{status:response.status,retryAfter:Math.max(0,Number(data.retryAfter || response.headers.get("Retry-After")) || 0)});
    return data;
  }
  async function prepare(text, signal) {
    const key=audioKey(text), cached=cache.get(key);
    if(cached?.expiresAt>Date.now())return cached;
    // Um pré-carregamento em andamento é reaproveitado em vez de gerar outro pedido.
    if(pending.has(key))return pending.get(key);
    const job=request(text,signal).then(data=>{cache.set(key,data);return data;});
    if(!signal){pending.set(key,job);job.finally(()=>pending.delete(key)).catch(()=>{});}
    return job;
  }
  // Installed voices are ready without a server request; remote voices reuse the URL.
  const preload = text => browserSpeech.hasVoice() ? Promise.resolve({ provider: "Web Speech API" }) : prepare(text);
  async function speak(text, button = null) {
    if (button && activeButton === button) { stop(); return false; }
    stop();
    const request=sequence;
    activeButton=button;mark(button,"loading");
    const done=()=>{if(request===sequence){clearTimeout(playbackTimer);mark(button,"idle");activeButton=null;}};
    const fail=message=>{if(request!==sequence)return;done();toast(message);};
    const reading = getPronunciation(text);
    if (!reading) { fail("Escolha uma pronúncia do conteúdo de estudo."); return false; }
    if (browserSpeech.hasVoice()) {
      try {
        return await browserSpeech.speak(reading.spoken, {
          rate: preferences().audioRate || 1,
          onStart: () => { if (request === sequence) mark(button, "playing"); },
          onEnd: done,
          onError: error => {
            if (request !== sequence) return;
            done();
            if (error.name !== "AbortError") toast("A voz foi interrompida. Toque novamente para ouvir.");
          }
        });
      } catch (error) {
        if (request !== sequence) return false;
        if (error.name === "AbortError") { done(); return false; }
        if (error.name === "NotAllowedError") { fail("Toque em ouvir novamente para iniciar a reprodução."); return false; }
        // A missing or stalled system voice must not make the lesson unusable.
      }
    }
    if (request !== sequence) return false;
    requestController=new AbortController();
    const player=new Audio();
    media=player;
    player.preload="auto";
    player.playbackRate=preferences().audioRate || 1;
    player.preservesPitch=true;
    player.addEventListener("playing",()=>{if(request===sequence){clearTimeout(playbackTimer);mark(button,"playing");}},{once:true});
    player.addEventListener("ended",done,{once:true});
    player.addEventListener("error",()=>{cache.delete(audioKey(text));fail("A API não conseguiu reproduzir este áudio. Toque novamente para tentar.");},{once:true});
    playbackTimer=setTimeout(()=>{if(request===sequence){stop();toast("A pronúncia está demorando para ficar pronta. Tente ouvir novamente em alguns instantes.");}},30000);
    try{
      const data=await prepare(text,requestController.signal);
      if(request!==sequence)return false;
      player.src=data.url;
      player.defaultPlaybackRate=preferences().audioRate || 1;
      player.playbackRate=player.defaultPlaybackRate;
      await player.play();
      return request===sequence;
    }catch(error){
      if(request!==sequence || error.name==="AbortError")return false;
      if(error.name==="NotAllowedError")fail("Áudio pronto. Toque em ouvir novamente para iniciar a reprodução.");
      else fail(error.message || "Não foi possível conectar à API de voz.");
      return false;
    }
  }
  function feedback(kind) {
    const prefs = preferences();
    if (!prefs.soundEffects) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      effectContext ||= new AudioContext();
      void effectContext.resume().catch(() => {});
      const notes = kind === "complete" ? [523.25,659.25,783.99,1046.5] : kind === "correct" ? [659.25,880] : [220,164.81];
      const start = effectContext.currentTime;
      notes.forEach((frequency,index) => {
        const oscillator = effectContext.createOscillator(), gain = effectContext.createGain();
        oscillator.type = "sine"; oscillator.frequency.value = frequency;
        const time = start + index * .10;
        gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(.022,time+.008); gain.gain.exponentialRampToValueAtTime(.0001,time+.10);
        oscillator.connect(gain); gain.connect(effectContext.destination);
        oscillator.start(time); oscillator.stop(time+.11);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Feedback sounds are optional; scoring does not depend on Web Audio. */ }
  }
  return { speak, stop, feedback, preload };
}
