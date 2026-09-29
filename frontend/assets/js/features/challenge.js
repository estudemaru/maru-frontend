import { challengeItems, createChallenge, challengeAdvice } from '/shared/challenge.js';
import { KANA_ROWS } from '/shared/content.js';
import { recordReview } from '/shared/progress.js';
import { pageHeading, esc, icon, routeLink, shuffle, beginnerText } from '../core/ui.js';

export function renderChallenge(ctx, initial = 'hiragana') {
  const controller = new AbortController();
  let mode = ['hiragana','katakana','sentences','listening'].includes(initial) ? initial : 'hiragana';
  let family = 'a', seconds = 30, game, timer, generation = 0, preparing = false, warning = false;
  const title = {hiragana:'Escreva hiragana',katakana:'Escreva katakana',sentences:'Escreva uma frase',listening:'Ouça e escreva'};
  const heading = () => pageHeading('PEQUENAS RODADAS, MUITA PRÁTICA',title[mode],'Até cinco tentativas. Veja o resultado de cada uma e descubra o que revisar.',routeLink('practice','Voltar às práticas','btn btn-ghost'));
  function setup() {
    clearInterval(timer); generation++; preparing=false; ctx.audio.stop();
    ctx.main.innerHTML = heading() + `<form id="challenge-setup" class="panel challenge-setup">
      <h2>Escolha seu treino</h2><p>Começando agora? Use as vogais e experimente primeiro sem tempo. Na escrita, você pode digitar ou tocar nas letras.</p>
      <div class="challenge-options"><label>Atividade<select class="text-input" name="mode">${Object.entries(title).map(([id,label])=>`<option value="${id}" ${id===mode?'selected':''}>${label}</option>`).join('')}</select></label>
      <label ${mode==='sentences'?'hidden':''}>Família<select class="text-input" name="family">${KANA_ROWS.filter(row=>row.id!=='n').map(row=>`<option value="${row.id}" ${family===row.id?'selected':''}>${row.id==='a'?'Vogais · a, i, u, e, o':row.id==='wa'?'WA, WO e N':row.id.toUpperCase()}</option>`).join('')}<option value="all" ${family==='all'?'selected':''}>Todas · para revisar</option></select></label>
      <label>Tempo por tentativa<select class="text-input" name="seconds">${[[0,'Sem tempo · aprender'],[15,'15 segundos'],[30,'30 segundos'],[60,'60 segundos']].map(([value,label])=>`<option value="${value}" ${seconds===value?'selected':''}>${label}</option>`).join('')}</select></label></div>
      <p>Se o tempo acabar, você perde aquela tentativa e recebe a resposta para estudar. Seus acertos anteriores continuam salvos.</p><button class="btn btn-primary" type="submit">Começar rodada ${icon('arrow')}</button></form>
      <aside class="tip-box">${icon('pen')}<p>Depois da rodada, escreva os caracteres difíceis no papel e leia em voz alta. ${routeLink('worksheets','Preparar uma folha de escrita','text-link')}</p></aside>`;
  }
  function finish(result) {
    if (!result) return;
    clearInterval(timer); ctx.audio.stop();
    recordReview(ctx.progress,result.id,result.correct);
    if (mode==='sentences' && result.correct) ctx.progress.stats.sentencesWritten++;
    ctx.save(); ctx.audio.feedback(result.correct?'correct':'wrong');
    draw(); ctx.main.querySelector('[data-challenge="next"]')?.focus();
  }
  function tick() {
    if (game.phase!=='answer') return;
    const remaining = game.remaining(Date.now());
    const clock = ctx.main.querySelector('#challenge-clock');
    if (clock) clock.textContent = remaining===null ? 'Sem cronômetro' : `${Math.ceil(remaining/1000)} s`;
    if (remaining!==null && remaining<=5000 && !warning) { warning=true; ctx.main.querySelector('#challenge-status').textContent='Faltam cinco segundos.'; }
    finish(game.expire(Date.now()));
  }
  async function startItem() {
    if (preparing || game.phase!=='ready') return;
    const current = ++generation;
    if (mode==='listening') {
      preparing=true; draw();
      const played = await ctx.audio.speak(game.item.answer,ctx.main.querySelector('[data-challenge="listen"]'));
      if (controller.signal.aborted || current!==generation) return;
      preparing=false;
      if (!played) { draw(); ctx.main.querySelector('#challenge-status').textContent='O áudio não iniciou. Tente ouvir novamente; nenhuma tentativa foi perdida.'; return; }
    }
    game.start(Date.now()); warning=false; draw(); tick(); timer=setInterval(tick,200);
    ctx.main.querySelector('#challenge-answer')?.focus({preventScroll:true});
  }
  function draw() {
    if (game.phase==='complete') {
      const results=game.results, advice=challengeAdvice(results), correct=results.filter(item=>item.correct).length;
      ctx.main.innerHTML=heading()+`<section class="panel challenge-results"><p class="eyebrow">RODADA CONCLUÍDA</p><h2 tabindex="-1">${correct} de ${results.length} tentativas certas</h2><p>${advice.length?'Seu próximo treino pode focar nestes pontos:':'Você acertou este grupo. Repita sem olhar o modelo ou experimente a próxima família.'}</p>${advice.map(item=>`<article class="challenge-advice"><h3>${esc(beginnerText(item.topic))}</h3><p>${item.misses} de ${item.attempts} tentativas para reforçar.${item.timeouts?' Comece sem cronômetro para ganhar segurança.':''}</p><p class="challenge-review-items">${item.items.map(entry=>`<span><b lang="ja">${esc(entry.answer)}</b> · ${esc(entry.romaji)}</span>`).join('')}</p>${routeLink(item.route,'Estudar este ponto','text-link')}</article>`).join('')}<div class="challenge-actions"><button class="btn btn-primary" data-challenge="retry">Repetir a rodada</button><button class="btn btn-ghost" data-challenge="setup">Escolher outro treino</button>${routeLink('worksheets','Praticar no papel','btn btn-ghost')}</div></section>`;
      ctx.main.querySelector('.challenge-results h2').focus({preventScroll:true});
      return;
    }
    const item=game.item, feedback=game.phase==='feedback' ? game.results.at(-1) : null;
    const keys=mode==='sentences'?[]:challengeItems(mode,family).map(entry=>entry.answer);
    ctx.main.innerHTML=heading()+`<section class="panel challenge-stage"><div class="challenge-round"><strong>Tentativa ${game.index+1} de ${game.total}</strong><span id="challenge-clock" role="timer" aria-live="off">${seconds?`${Math.ceil((game.remaining(Date.now()) ?? seconds*1000)/1000)} s`:'Sem cronômetro'}</span></div><p class="eyebrow">${mode==='listening'?'OUÇA O SOM':mode==='sentences'?'ESCREVA A FRASE DESTA SITUAÇÃO':'ESCREVA O CARACTERE DESTE SOM'}</p>${mode==='listening'?`<button class="btn btn-primary" data-challenge="listen" ${preparing||feedback?'disabled':''}>${icon('volume')} ${preparing?'Preparando áudio…':game.phase==='ready'?'Ouvir e começar':'Ouvir novamente'}</button>`:`<h2 class="challenge-prompt">${esc(item.prompt)}</h2>`}
      <form id="challenge-answer-form"><label for="challenge-answer">${mode==='sentences'?'Sua frase em kana ou romaji':'Sua resposta em '+(mode==='katakana'?'katakana':'hiragana')}</label><input id="challenge-answer" class="text-input challenge-input" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" required ${game.phase!=='answer'?'disabled':''} aria-describedby="challenge-status">
      ${keys.length?`<div class="challenge-keyboard" role="group" aria-label="Letras para escrever">${keys.map(char=>`<button type="button" data-kana-key="${char}" ${game.phase!=='answer'?'disabled':''} lang="ja">${char}</button>`).join('')}<button type="button" data-kana-key="delete" ${game.phase!=='answer'?'disabled':''} aria-label="Apagar último caractere">⌫</button></div>`:''}
      ${feedback?'':`<button class="btn btn-primary" type="submit" ${game.phase!=='answer'?'disabled':''}>Conferir resposta</button>`}</form><p id="challenge-status" role="status" aria-live="polite"></p>
      ${feedback?`<div class="feedback ${feedback.correct?'success':'retry'}" role="status"><strong>${feedback.timeout?'O tempo acabou nesta tentativa.':feedback.correct?'Você acertou!':'Vamos revisar este item.'}</strong><p class="challenge-model" lang="ja">${esc(item.answer)}</p><p>${esc(item.romaji)}</p><p>${esc(beginnerText(item.hint))}</p></div><button class="btn btn-primary" data-challenge="next">${game.index+1===game.total?'Ver o que revisar':'Próxima tentativa'}</button>`:''}</section>`;
  }
  ctx.main.addEventListener('change',event=>{
    if(event.target.form?.id!=='challenge-setup')return;
    const data=new FormData(event.target.form);
    mode=data.get('mode');family=data.get('family');seconds=Number(data.get('seconds'));
    if(event.target.name==='mode'){setup();ctx.main.querySelector('[name="mode"]').focus();}
  }, {signal:controller.signal});
  ctx.main.addEventListener('submit',event=>{
    if(event.target.id==='challenge-setup'){event.preventDefault();game=createChallenge(shuffle(challengeItems(mode,family)).slice(0,5),seconds);draw();if(mode!=='listening')void startItem();}
    if(event.target.id==='challenge-answer-form'){event.preventDefault();finish(game.answer(new FormData(event.target).get('answer'),Date.now()));}
  },{signal:controller.signal});
  ctx.main.addEventListener('keydown',event=>{if(event.isComposing && event.key==='Enter')event.preventDefault();},{signal:controller.signal});
  ctx.main.addEventListener('click',event=>{
    const key=event.target.closest('[data-kana-key]')?.dataset.kanaKey;
    if(key && game.phase==='answer'){const input=ctx.main.querySelector('#challenge-answer');input.value=key==='delete'?[...input.value].slice(0,-1).join(''):input.value+key;input.focus();}
    const action=event.target.closest('[data-challenge]')?.dataset.challenge;
    if(action==='listen'){if(game.phase==='ready')void startItem();else if(game.phase==='answer')void ctx.audio.speak(game.item.answer);}
    if(action==='next' && game.next()){draw();if(game.phase==='ready'&&mode!=='listening')void startItem();}
    if(action==='setup')setup();
    if(action==='retry'){game=createChallenge(shuffle(challengeItems(mode,family)).slice(0,5),seconds);draw();if(mode!=='listening')void startItem();}
  },{signal:controller.signal});
  setup();
  return()=>{controller.abort();generation++;clearInterval(timer);ctx.audio.stop();};
}
