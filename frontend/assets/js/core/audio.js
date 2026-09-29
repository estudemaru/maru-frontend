import { audioKey } from "/shared/audioText.js";

export function createAudio(toast, preferences = () => ({})) {
  let sequence = 0, media = null, activeButton = null, requestController = null, effectContext = null, playbackTimer = null;
  const cache = new Map();
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
    if (media) { media.pause(); media.removeAttribute("src"); media.load(); media = null; }
    mark(activeButton, "idle"); activeButton = null;
  }
  async function prepare(text, signal) {
    const key=audioKey(text), cached=cache.get(key);
    if(cached?.expiresAt>Date.now())return cached;
    const response=await fetch("/api/audio",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({text}),signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error || "A pronúncia está indisponível. Tente novamente.");
    cache.set(key,data);
    return data;
  }
  async function speak(text, button = null) {
    if (button && activeButton === button) { stop(); return false; }
    stop();
    const request=sequence;
    requestController=new AbortController();
    activeButton=button;mark(button,"loading");
    const done=()=>{if(request===sequence){clearTimeout(playbackTimer);mark(button,"idle");activeButton=null;}};
    const fail=message=>{if(request!==sequence)return;done();toast(message);};
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
    if (prefs.theme !== "arcade" || !prefs.soundEffects) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      effectContext ||= new AudioContext();
      void effectContext.resume().catch(() => {});
      const notes = kind === "complete" ? [523.25,659.25,783.99,1046.5] : kind === "correct" ? [659.25,880] : [220,164.81];
      const start = effectContext.currentTime;
      notes.forEach((frequency,index) => {
        const oscillator = effectContext.createOscillator(), gain = effectContext.createGain();
        oscillator.type = "square"; oscillator.frequency.value = frequency;
        const time = start + index * .10;
        gain.gain.setValueAtTime(0,time); gain.gain.linearRampToValueAtTime(.022,time+.008); gain.gain.exponentialRampToValueAtTime(.0001,time+.10);
        oscillator.connect(gain); gain.connect(effectContext.destination);
        oscillator.start(time); oscillator.stop(time+.11);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Feedback sounds are optional; scoring does not depend on Web Audio. */ }
  }
  return { speak, stop, feedback };
}
