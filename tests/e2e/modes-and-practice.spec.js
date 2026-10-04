import { test, expect } from "@playwright/test";
import { LISTENING_EXERCISES, PARTICLE_EXERCISES } from "../../shared/exercises.js";
import { bookKanaText } from "../../frontend/assets/js/features/book-content.js";
import { VOCABULARY } from "../../shared/vocabulary.js";

// Exercise browser playback deterministically without consuming a public API quota.
// The real service is also checked separately against its remote streaming URL.
const testWave=Buffer.alloc(44+48000);
testWave.write("RIFF",0);testWave.writeUInt32LE(testWave.length-8,4);testWave.write("WAVEfmt ",8);testWave.writeUInt32LE(16,16);testWave.writeUInt16LE(1,20);testWave.writeUInt16LE(1,22);testWave.writeUInt32LE(24000,24);testWave.writeUInt32LE(48000,28);testWave.writeUInt16LE(2,32);testWave.writeUInt16LE(16,34);testWave.write("data",36);testWave.writeUInt32LE(48000,40);
for(let i=0;i<24000;i++)testWave.writeInt16LE(Math.round(1500*Math.sin(2*Math.PI*440*i/24000)),44+i*2);
test.beforeEach(async({page})=>{
  await page.route("**/api/audio",route=>route.fulfill({json:{url:"https://audio1.tts.quest/v1/data/abc123/audio.mp3s",expiresAt:Date.now()+600000,attribution:"VOICEVOX:ずんだもん"}}));
  await page.route("https://audio1.tts.quest/**",route=>route.fulfill({contentType:"audio/wav",body:testWave}));
});

async function go(page, route) {
  await page.goto("/#/"+route);
  await expect(page.locator("main h1")).toBeVisible();
}
const snapshot = page => page.evaluate(()=>JSON.parse(localStorage.getItem("maru-learning-v2")));

test("palette and motion preferences persist",async({page})=>{
  await go(page,"arcade/repeat");
  await page.getByRole('button',{name:'Vamos jogar'}).click();
  await page.locator('#arcade-answer').fill('あ');
  await page.getByRole('button',{name:'Ativar modo escuro',exact:true}).click();
  await expect(page.locator('#arcade-answer')).toHaveValue('あ');
  await expect(page.locator('#toast')).toContainText('Estilo Sumi-e Noite ativado');
  await expect(page.locator('#arcade-hud')).toBeHidden();
  await expect(page.locator('html')).toHaveCSS('color-scheme','dark');
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme","arcade");
  await go(page,"home");
  await expect(page.locator(".play-hero h1")).toHaveCSS("font-family", /Shippori Mincho/);
  await expect(page.locator(".book-scene")).toBeVisible();
  await expect(page.locator(".hero-sun")).not.toHaveCSS("animation-name","none");
  await expect(page.locator(".hero-petals")).toBeAttached();
  await page.getByRole("button",{name:"Pausar animações"}).click();
  await expect(page.locator(".hero-sun")).toHaveCSS("animation-name","none");
  await expect(page.locator(".hero-badge svg")).toHaveCSS("animation-name","none");
  await expect(page.locator(".hero-petals")).toBeHidden();
  await page.reload();
  await expect(page.getByRole("button",{name:"Retomar animações"})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Retomar animações"}).click();
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(page.locator(".hero-sun")).toHaveCSS("animation-name","none");
  await expect(page.locator(".hero-petals")).toBeHidden();
  await page.locator(".play-card-art img").evaluateAll(images => images.forEach(img => { img.loading = "eager"; }));
  await expect.poll(() => page.locator(".play-card-art img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await page.screenshot({path:'test-results/arcade-night-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await expect(page.locator('.play-hero')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/arcade-night-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Ativar modo claro',exact:true}).click();
  await expect(page.locator('html')).toHaveCSS('color-scheme','light');
  await expect(page.locator(".play-hero h1")).toHaveCSS("font-family", /Shippori Mincho/);
  // No celular a paisagem da capa sai da frente; os jogos sobem para perto do topo.
  await expect(page.locator(".book-scene")).toBeHidden();
  await expect(page.locator('#toast')).toContainText('Estilo Sumi-e ativado');
  await page.locator('#toast').evaluate(el => { el.hidden = true; });
  await page.screenshot({path:'test-results/sumi-book-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.reload();
  await expect(page.locator('.play-hero')).toBeVisible();
  await page.screenshot({path:'test-results/sumi-book-desktop.png',fullPage:true});
});

test("API pronunciation plays with no installed voices, respects speed and stops on toggle",async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window,"speechSynthesis",{value:undefined,configurable:true});
    const OriginalAudio=window.Audio;
    window.audioEvents=[];
    window.Audio=class extends OriginalAudio{
      constructor(src){super(src);window.lastAudio=this;for(const event of ["playing","ended","error","pause"])this.addEventListener(event,()=>window.audioEvents.push(event));}
    };
  });
  await go(page,"settings");
  await page.locator("#setting-audio-rate").selectOption("0.75");
  const button=page.getByRole("button",{name:"Testar pronúncia japonesa"});
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed","true");
  await expect.poll(()=>page.evaluate(()=>window.lastAudio?.currentTime || 0)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.lastAudio.playbackRate)).toBe(.75);
  expect(await page.evaluate(()=>window.lastAudio.currentSrc)).toContain("tts.quest");
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed","false");
  expect(await page.evaluate(()=>window.lastAudio.paused)).toBe(true);
  await button.click();
  await expect.poll(()=>page.evaluate(()=>window.audioEvents.includes("ended")),{timeout:10000}).toBe(true);
  await expect(button).toHaveAttribute("aria-busy","false");
  expect(await page.evaluate(()=>window.audioEvents.includes("error"))).toBe(false);
});

test("listening hides transcription until the answer and records the actual response",async({page})=>{
  await go(page,"exercises");
  await page.locator('[data-start-exercises="listening"]').click();
  const speaker=page.getByRole("button",{name:"Ouvir a pergunta"});
  const speech=await speaker.getAttribute("data-speak");
  const item=LISTENING_EXERCISES.find(item=>item.speech===speech);
  expect(item).toBeTruthy();
  await expect(page.locator(".quiz-character")).toHaveCount(0);
  await speaker.click();
  await expect(speaker).toHaveAttribute("aria-pressed","true");
  await expect(page.locator(".feedback")).toHaveCount(0);
  await page.getByRole("radio",{name:item.answer,exact:false}).check();
  await page.getByRole("button",{name:"Verificar resposta",exact:true}).click();
  await expect(page.locator(".feedback")).toHaveClass(/success/);
  // Furigana is always shown now; the reading still appears as a substring alongside the kanji.
  await expect(page.locator(".feedback")).toContainText(item.reading);
  expect((await snapshot(page)).reviews[item.id].correct).toBe(1);
});

test("particle activities explain the selected model and wrong answers enter the review schedule",async({page})=>{
  await go(page,"exercises");
  await page.locator('[data-start-exercises="particles"]').click();
  // Furigana is always on now, so the prompt renders as kanji + <rt> reading;
  // strip the reading back out to recover the original (kanji-form) prompt.
  const prompt=await page.locator(".quiz-character").evaluate(el => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll("rt").forEach(rt => rt.remove());
    return clone.textContent;
  });
  // Some prompts have a different requested nuance: match both prompt and context.
  const context=await page.locator(".quiz-stage > .muted").innerText();
  const exact=PARTICLE_EXERCISES.find(item=>item.prompt===prompt && bookKanaText(item.context)===context);
  const wrong=exact.choices.find(choice=>choice!==exact.answer);
  await page.getByRole("radio",{name:new RegExp("^[1-4] " + wrong + "$")}).check();
  await page.getByRole("button",{name:"Verificar resposta",exact:true}).click();
  await expect(page.locator(".feedback")).toHaveClass(/retry/);
  await expect(page.locator(".feedback")).toContainText(bookKanaText(exact.explanation));
  const p=await snapshot(page);
  expect(p.reviews[exact.id].correct).toBe(0);
  expect(p.reviews[exact.id].interval).toBe(0);
  expect(p.reviews[exact.id].due-p.reviews[exact.id].updatedAt).toBe(600000);
});

test("vocabulary and beginner explanations can be searched and reviewed",async({page})=>{
  await go(page,"vocabulary");
  await page.locator("#word-search").fill("água");
  await expect(page.locator(".word-card")).toHaveCount(1);
  await page.locator("[data-add-review]").click();
  expect((await snapshot(page)).reviews[VOCABULARY.find(item=>item.jp==="水").id]).toBeTruthy();
  await go(page,"glossary");
  await page.locator("#glossary-search").fill("mora");
  await expect(page.locator("#concept-mora")).toBeVisible();
  await go(page,"lesson/start-language");
  await expect(page.locator(".lesson-reader")).toBeVisible();
});

test("separate browsers keep their own preferences and server profile",async({page,browser})=>{
  await go(page,"settings");
  await page.locator('.theme-card[data-theme-choice="arcade"]').click();
  await expect(page.locator("#save-status")).toHaveText("Progresso salvo");
  const first=await page.evaluate(()=>localStorage.getItem("maru-profile-id"));
  const other=await browser.newContext();
  try{
    const second=await other.newPage();
    await second.goto(page.url());
    await expect(second.locator("main h1")).toBeVisible();
    await expect(second.locator("html")).toHaveAttribute("data-theme","dojo");
    expect(await second.evaluate(()=>localStorage.getItem("maru-profile-id")) ).not.toBe(first);
  }finally{await other.close();}
});

test("all themes fit desktop, tablet and small phones",async({page})=>{
  test.setTimeout(150000);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  for(const theme of ["dojo","arcade"]){
    await go(page,"settings");await page.locator('.theme-card[data-theme-choice="'+theme+'"]').click();
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:900});
      const routes=theme!=="dojo"?["home","journey","kana","kanji","writing","sentences","particles","expressions","library","review","settings","lesson/welcome","vocabulary","exercises","worksheets","glossary","teacher","account","progress","practice","arcade/sentences","arcade/pictures","arcade/translate","explore"]:["home","account","progress","practice","arcade/sentences","explore","vocabulary","exercises","worksheets","glossary","settings"];
      for(const route of routes){
        await go(page,route);
        await expect(page.locator("body"),theme+" colors at "+width).toHaveCSS("background-color",{arcade:"rgb(17, 26, 44)",dojo:"rgb(243, 234, 215)"}[theme]);
        if(route === "worksheets") await expect(page.locator('#worksheet-preview')).toHaveAttribute('data-ready','true');
        await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),{message:theme+" "+route+" at "+width}).toBe(false);
        if ([1440,390].includes(width) && ['settings','explore','arcade/sentences','progress'].includes(route)) {
          await page.screenshot({path:`test-results/interface-${theme}-${route.replace('/','-')}-${width}.png`,fullPage:true});
        }
      }
    }
    await page.setViewportSize({width:1440,height:1000});
  }
  expect(errors).toEqual([]);
});

test("voice API failures explain the interruption and leave the button usable",async({page})=>{
  await page.route("**/api/audio",route=>route.fulfill({status:429,json:{error:"A API de voz pediu um intervalo. Tente novamente em 10 segundos.",retryAfter:10}}));
  await go(page,"settings");
  const button=page.getByRole("button",{name:"Testar pronúncia japonesa"});
  await button.click();
  await expect(page.locator("#toast")).toContainText("10 segundos");
  await expect(button).toHaveAttribute("aria-busy","false");
  await expect(button).toBeEnabled();
});

test("KanjiAPI readings load on expansion and remain usable if the provider is offline",async({page})=>{
  let calls=0;
  await page.route("https://kanjiapi.dev/v1/kanji/**",route=>{calls++;return route.fulfill({json:{kanji:"水",stroke_count:4,kun_readings:["みず"],on_readings:["スイ"],meanings:["water"]}});});
  await go(page,"kanji");
  const card=page.locator('[data-kanji="水"]');
  await card.locator("summary").click();
  await expect(card.locator(".kanji-api-details")).toContainText("スイ");
  await expect(card.locator(".kanji-api-details")).toContainText("4 traços");
  expect(calls).toBe(1);
  await page.reload();await card.locator("summary").click();
  await expect(card.locator(".kanji-api-details")).toContainText("スイ");
  expect(calls).toBe(1);
  await page.route("https://kanjiapi.dev/v1/kanji/**",route=>route.abort());
  const fire=page.locator('[data-kanji="火"]');await fire.locator("summary").click();
  await expect(fire.locator(".kanji-api-details")).toContainText("Consulta salva da KanjiAPI");
  await expect(fire.locator(".kanji-api-details")).toContainText("4 traços");
});
