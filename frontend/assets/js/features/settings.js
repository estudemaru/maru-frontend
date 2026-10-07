import { accountHTML, bindAccountProviders } from "./account.js";
import { moduleSeals } from "/shared/learningPath.js";
import { LESSONS } from "/shared/curriculum.js";
import { currentStreak } from "/shared/progress.js";
import { ACHIEVEMENTS, playerLevel } from "/shared/gamification.js";
import { THEMES } from "../core/theme.js";
import { JP_FONTS, SAMPLE, applyJpFont, loadPreviews } from "../core/jpFont.js";
import { pageHeading, icon, routeLink, audioButton } from "../core/ui.js";
import { signUpWithEmail, signInWithEmail, recoverEmail, changeEmailPassword } from "../api.js";

export function renderSettings(ctx, status = "", accountOnly = false) {
  const controller = new AbortController(), p = ctx.progress;
  const level = playerLevel(p.xp.total);
  ctx.main.innerHTML = pageHeading("DO SEU JEITO", "Um ritmo que combina com você.", "Escolha o seu espaço, ajuste os sons e encontre uma meta que cabe no seu dia.") +
    accountHTML(ctx, status) + `<section class="panel settings-panel"><h2>Sumi-e de dia. Sumi-e à noite.</h2><p class="muted">Troque quando quiser. Seus jogos, escrita e revisões continuam de onde você parou.</p><div class="theme-options" role="group" aria-label="Escolha seu modo visual">${THEMES.map(theme=>`<button class="theme-card" data-theme-choice="${theme.id}" aria-pressed="${p.preferences.theme===theme.id}"><span class="theme-preview ${theme.id}"><span lang="ja">${theme.symbol}</span><small>${theme.tag}</small></span><strong>${theme.title}<span class="theme-card-sub"> · ${theme.subtitle}</span></strong><small>${theme.description}</small></button>`).join("")}</div></section><section class="panel settings-panel jp-font-panel" aria-labelledby="jp-font-title"><h2 id="jp-font-title">Letra do japonês nos jogos</h2><p class="muted">Kana e kanji mudam bastante de uma letra para outra. Escolha a que você lê melhor; ela vale para cartas, perguntas e respostas dos jogos.</p><div class="jp-font-options" role="radiogroup" aria-label="Letra dos kana e kanji">${JP_FONTS.map(font=>`<label class="jp-font-option"><input type="radio" name="jp-font" value="${font.id}" ${p.preferences.jpFont===font.id?"checked":""}><span class="jp-font-sample" lang="ja" style="font-family:'${font.family}', sans-serif">${SAMPLE}</span><strong>${font.name}</strong><small>${font.note}</small></label>`).join("")}</div></section>
    <div class="settings-layout"><section class="panel settings-panel"><h2>Seu aprendizado</h2><div class="setting-row"><div><h3>Seu ponto de partida</h3><p class="only-wide">Um diagnóstico curto sugere a unidade da trilha por onde começar e abre as anteriores.</p></div>${routeLink("placement", "Encontrar meu começo", "btn btn-ghost")}</div><div class="setting-row only-wide"><div><h3>Espaço para uma pausa</h3><p>Uma pausa de um dia por semana não quebra sua constância. Ao voltar, ela é registrada sem ganhar atividades ou XP. A semana vai de segunda a domingo.</p></div><span class="hanko small-hanko" aria-hidden="true">休</span></div><div class="setting-row"><div><h3>Leitura de apoio em romaji</h3><p>Mostra a leitura em letras latinas junto dos exemplos. Use no começo e experimente esconder quando reconhecer os kana.</p></div><label class="switch"><input id="setting-romaji" type="checkbox" ${p.preferences.romaji?"checked":""}><span aria-hidden="true"></span><span class="sr-only">Mostrar romaji</span></label></div><div class="setting-row"><div><h3>Digitar em romaji</h3><p>Nos jogos, o que você digita em letras latinas vira kana na hora: <span lang="ja">neko → ねこ</span>. MAIÚSCULAS ou o botão ア viram katakana. Quem usa teclado japonês não precisa mudar nada.</p></div><label class="switch"><input id="setting-kana-input" type="checkbox" ${p.preferences.kanaInput!==false?"checked":""}><span aria-hidden="true"></span><span class="sr-only">Converter romaji em kana ao digitar</span></label></div>
    <div class="setting-row vertical"><div><h3>Sua meta diária</h3><p class="only-wide">Uma atividade é uma resposta de prática, uma lição concluída ou um registro de escrita.</p></div><div class="goal-options">${[[5,"Um começo leve"],[10,"Criando o hábito"],[15,"Um pouco mais"]].map(([goal,label])=>`<label class="goal-option"><input type="radio" name="daily-goal" value="${goal}" ${p.preferences.dailyGoal===goal?"checked":""}><strong>${goal} atividades</strong><span>${label}</span></label>`).join("")}</div></div>
    <div class="setting-row"><div><h3>Velocidade da pronúncia</h3><p class="only-wide">Ouça mais devagar e depois tente no ritmo de estudo.</p></div><select id="setting-audio-rate" class="text-input" aria-label="Velocidade da pronúncia">${[[.75,"Mais devagar · 0,75×"],[1,"Ritmo de estudo · 1×"],[1.15,"Um pouco mais rápido · 1,15×"]].map(([rate,label])=>`<option value="${rate}" ${p.preferences.audioRate===rate?"selected":""}>${label}</option>`).join("")}</select></div>
    <div class="setting-row"><div><h3>Experimente o áudio</h3><p><span lang="ja">こんにちは</span> · konnichiwa · olá</p></div>${audioButton("こんにちは","Testar pronúncia japonesa")}</div>
    <div class="setting-row"><div><h3>Efeitos de jogo no Arcade</h3><p class="only-wide">Sons curtos ao acertar, errar e concluir. A pronúncia continua disponível com esta opção desligada.</p></div><label class="switch"><input id="setting-effects" type="checkbox" ${p.preferences.soundEffects?"checked":""}><span aria-hidden="true"></span><span class="sr-only">Efeitos de jogo</span></label></div>
    <p class="audio-status-note only-wide">A pronúncia usa a voz japonesa disponível no seu aparelho. Se ela não estiver disponível, usamos uma voz pela internet (VOICEVOX:No.7), que pode levar alguns segundos para ficar pronta. Toque uma vez para ouvir e novamente para interromper. Para escutar falantes em conversas reais, explore os recursos da biblioteca.</p><div class="setting-note">${icon("check")} As preferências são salvas automaticamente.</div></section>
    <aside class="panel progress-overview"><span class="jp" lang="ja">歩</span><h2>Cada passo fica.</h2><dl><div><dt>Lições concluídas</dt><dd>${LESSONS.filter(lesson=>p.lessons[lesson.id]?.completedAt).length} / ${LESSONS.length}</dd></div><div><dt>Experiência acumulada</dt><dd>${p.xp.total} XP</dd></div><div><dt>Nível de experiência</dt><dd>${level.level}</dd></div><div><dt>Dias de constância</dt><dd>${currentStreak(p)}</dd></div><div><dt>Frases acertadas</dt><dd>${p.stats.sentencesWritten}</dd></div><div><dt>Práticas de escrita</dt><dd>${p.stats.writingSessions}</dd></div></dl><p class="small muted only-wide">O nível acompanha sua prática no Maru; não é uma avaliação de proficiência.</p>${routeLink("progress","Ver meu desempenho "+icon("arrow"),"text-link")}</aside></div>
    <section class="panel settings-panel about-panel"><h2>Pequenas conquistas, progresso real.</h2><p class="muted">Cada conquista acompanha uma atividade feita por você. Elas valem nos dois estilos.</p><div class="achievement-grid">${ACHIEVEMENTS.map(item=>{const earned=item.test(p);return `<article class="achievement ${earned?"is-earned":""}"><span class="badge-symbol jp" lang="ja">${item.symbol}</span><h3>${item.title}</h3><p>${item.description}</p><small>${earned?"✓ Conquistada":"Em construção"}</small></article>`;}).join("")}</div></section>
    <section class="panel settings-panel about-panel"><h2>Os selos do seu caminho.</h2><p class="muted">Cada selo reúne uma unidade ou um extra com todas as lições concluídas. Diagnóstico e escolha de nível não concedem selos.</p><div class="stage-seals">${moduleSeals(p).map(module => `<article class="stage-seal ${module.earned ? "is-earned" : ""}"><span class="hanko jp" lang="ja">${module.symbol}</span><h3>${module.title}</h3><p>${module.done} / ${module.lessons.length} lições</p><small>${module.earned ? (module.extra ? "Extra concluído" : "Unidade concluída") : "Um traço de cada vez"}</small></article>`).join("")}</div></section><section class="panel settings-panel about-panel only-wide"><h2>Sobre este espaço</h2><p>Maru é um ponto de partida para quem começa japonês do zero. A trilha introduz leitura, escrita, gramática e situações de comunicação. Você pode estudar nos estilos Dojo ou Arcade e levar atividades para o papel.</p><p>Sem conta, cada navegador tem seu próprio perfil. Com uma conta, seu progresso é sincronizado entre os aparelhos em que você entrar. Sair da conta devolve este navegador ao perfil anônimo, sem misturar contas.</p>${routeLink("library","Conhecer os recursos e as referências "+icon("external"),"text-link")}</section>`;
  if (accountOnly) ctx.main.innerHTML = `<div class="account-page">${pageHeading('ENTRE COM SEU E-MAIL','Guarde seu progresso.','Crie uma conta ou entre para continuar seus estudos em outro aparelho.')}${accountHTML(ctx,status)}${routeLink('home','Continuar estudando','btn btn-ghost')}</div>`;
  if (!accountOnly) loadPreviews(SAMPLE);
  bindAccountProviders(ctx, controller.signal);
  ctx.main.addEventListener("click", async event => {
    const logout = event.target.closest("#account-logout");
    if (logout) {
      logout.disabled = true;
      try { await ctx.logout(); } catch { logout.disabled = false; ctx.toast("Não foi possível sair agora. Confira a conexão e tente novamente."); }
    }
    const tab = event.target.closest("#email-mode-login, #email-mode-signup");
    if (tab) {
      const signup = tab.id === "email-mode-signup";
      ctx.main.querySelectorAll(".account-tabs button").forEach(button => { button.setAttribute("aria-pressed", String(button === tab)); button.classList.toggle('is-active',button===tab); });
      ctx.main.querySelector("#account-password").autocomplete = signup ? "new-password" : "current-password";
      ctx.main.querySelector("#email-submit").textContent = signup ? "Criar conta por e-mail" : "Entrar com e-mail";
      ctx.main.querySelector("#account-feedback").textContent = "";
    }
    if (event.target.closest("#email-recover-toggle")) {
      const form = ctx.main.querySelector("#email-recover-form");
      form.hidden = !form.hidden;
      if (!form.hidden) { form.elements.email.value = ctx.main.querySelector("#account-email").value; form.elements.email.focus(); }
    }
  }, { signal: controller.signal });
  ctx.main.addEventListener("submit", async event => {
    const form = event.target;
    if (!["email-account-form", "email-recover-form", "password-change-form"].includes(form.id)) return;
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const feedback = ctx.main.querySelector("#account-feedback");
    button.disabled = true;
    feedback.textContent = "Aguarde…";
    try {
      if (form.id === "email-account-form") {
        const signup = ctx.main.querySelector("#email-mode-signup").getAttribute("aria-pressed") === "true";
        const email = form.elements.email.value.trim();
        const password = form.elements.password.value;
        if (signup) {
          await ctx.flush();
          const result = await signUpWithEmail(email, password);
          if (result.user) {
            location.replace("/#/account/login-success");
            location.reload();
            return;
          }
          feedback.textContent = result.message;
          form.elements.password.value = "";
        } else {
          await ctx.flush();
          await signInWithEmail(email, password);
          location.replace("/#/account/login-success");
          location.reload();
        }
      } else if (form.id === "email-recover-form") {
        const result = await recoverEmail(form.elements.email.value.trim());
        feedback.textContent = result.message;
      } else {
        await changeEmailPassword(form.elements.password.value);
        feedback.textContent = "Senha alterada. Guarde-a em um lugar seguro.";
        form.elements.password.value = "";
      }
    } catch (error) { feedback.textContent = error.message || "Não foi possível concluir. Tente novamente."; }
    finally { button.disabled = false; }
  }, { signal: controller.signal });
  ctx.main.addEventListener("change",event=>{
    if(event.target.name==="jp-font"){p.preferences.jpFont=event.target.value;applyJpFont(event.target.value);ctx.save();ctx.toast("Letra dos jogos: "+JP_FONTS.find(font=>font.id===event.target.value).name+".");return;}
    if (!["setting-romaji","setting-kana-input","setting-effects","setting-audio-rate"].includes(event.target.id) && event.target.name!=="daily-goal") return;
    if(event.target.id==="setting-romaji")p.preferences.romaji=event.target.checked;
    if(event.target.id==="setting-kana-input")p.preferences.kanaInput=event.target.checked;
    if(event.target.name==="daily-goal")p.preferences.dailyGoal=Number(event.target.value);
    if(event.target.id==="setting-effects")p.preferences.soundEffects=event.target.checked;
    if(event.target.id==="setting-audio-rate"){p.preferences.audioRate=Number(event.target.value);ctx.audio.stop();}
    ctx.save();ctx.toast("Preferências salvas.");
  },{signal:controller.signal});
  return ()=>controller.abort();
}
