import './game-focus.js';
import {showResult} from './results.js?v=fireworks-local-1';
import './game-hud.js?v=angular-game-11';
import {trackForLevel} from './tracks.js';
import {impact, bindButtonHaptics} from './telegram.js?v=all-haptics-1';
import {MusicPlayer,AssetCache} from './audio.js';
import {preparedChart,nearest,judge,WINDOW,PERFECT_WINDOW} from './rhythm.js';
import {starProgress,recordKey,tourMultiplier} from './scoring.js?v=hit-stars-1';
import {readTheme,drawRoad,drawZone,drawNote,drawHold,drawSpark,laneAt,loadTileAssets,project} from './design/renderer.js?v=direct-tiles-1';
const $=id=>document.getElementById(id),root=$('game'),canvas=$('highway'),ctx=canvas.getContext('2d'),media=$('music'),music=new MusicPlayer(media),cache=new AssetCache();
let w=0,h=0,theme,chart,notes=[],state='ready',score=0,combo=0,maxCombo=0,hits=0,offset=0,feedbackUntil=0,starting=false,loadRevision=0;
const fromMap = new URLSearchParams(location.search).get('from') === 'map' && window.parent !== window;
let mapLevel = null;
let tracks=[],currentTrack={id:'duck-tales',title:'Ксения Ишкина — Утиные истории',audio:'Music/duck-tales-90.m4a',chart:'charts-duck-tales.json'};
const preparedTracks=new Map();
const notifyMap = data => { if (fromMap) window.parent.postMessage(data, location.origin); };
bindButtonHaptics();
let lastCountdownBeat=-1;
const countdownRate=1.3,countdownDuration=3/countdownRate;
const duration=90,active=new Map(),flashes=[0,0,0],sparks=[],pressedNotes=[];
const reducedNoteMotion=matchMedia('(prefers-reduced-motion: reduce)');
const storage={get(k,d='0'){try{return localStorage.getItem(k)??d}catch{return d}},set(k,v){try{localStorage.setItem(k,String(v))}catch{}}};
const key=()=>recordKey(currentTrack.id,90,$('mode').value)+'.forest2';
$('offset').value=storage.get('forest.offset');
function starsMarkup(n){return Array.from({length:3},(_,i)=>`<span class="reward-star${i<n?' earned':''}" aria-hidden="true"></span>`).join('')}
function best(){const n=Number(storage.get(key()+'.stars'));$('best').innerHTML=`<span class="record-stars" role="img" aria-label="${n} из 3 звёзд">${starsMarkup(n)}</span> · Рекорд ${Number(storage.get(key())).toLocaleString('ru-RU')}`}
function setState(s){state=s;root.dataset.state=s;$('pause').hidden=s!=='playing';$('menu').hidden=s!=='ready';$('paused').hidden=s!=='paused';$('result').hidden=s!=='ended'}
function resize(){if(fromMap){for(const edge of ['top','bottom','left','right'])root.style.setProperty('--app-safe-'+edge,getComputedStyle(window.parent.document.documentElement).getPropertyValue('--app-safe-'+edge)||'0px')}const r=canvas.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);theme=readTheme(root)}
new ResizeObserver(resize).observe(canvas);resize();
function updateOffset(){$('offset-label').textContent=$('offset').value+' мс';storage.set('forest.offset',$('offset').value)}
$('offset').oninput=updateOffset;updateOffset();
function selectTrack(track){
 currentTrack=track;
 const prepared=preparedTracks.get(track.id);
 chart=preparedChart(prepared.bundle,duration,$('mode').value);
 if(media.src!==prepared.url)music.setSource(prepared.url);
 document.querySelector('#menu h1 + p').textContent=track.title;
 best();
}
async function load(){
 const rev=++loadRevision;$('start').disabled=true;$('status').textContent='Готовим музыку…';best();
 try{
  if(!tracks.length)tracks=JSON.parse(new TextDecoder().decode(await cache.get('tracks.json')));
  // Prepare all four native media sources before the level tap, preserving audio activation.
  let loaded=0;
  await Promise.all([loadTileAssets(),...tracks.map(async track=>{
   if(!preparedTracks.has(track.id)){
    const [map,data]=await Promise.all([cache.get(track.chart),cache.get(track.audio)]);
    const bundle=JSON.parse(new TextDecoder().decode(map));
    if(!preparedChart(bundle,duration,$('mode').value).notes.length)throw Error('Пустая карта');
    preparedTracks.set(track.id,{bundle,url:URL.createObjectURL(new Blob([data],{type:'audio/mp4'}))});
   }
   if(rev===loadRevision)$('status').textContent=`Готовим музыку… ${++loaded} / ${tracks.length}`;
  })]);
  if(rev!==loadRevision)return;
  selectTrack(tracks.find(track=>track.id===currentTrack.id)||tracks[0]);
  $('status').textContent='';$('start').textContent='Начать тур';$('start').disabled=false;
 }catch(e){
  if(rev!==loadRevision)return;chart=null;$('status').textContent='Не удалось загрузить музыку. Нажми для повтора.';
  $('start').textContent='Повторить загрузку';$('start').disabled=false;
 }
}
$('mode').onchange=load;
function clock(){return music.currentTime-offset}
function feedback(text,color){window.dispatchEvent(new CustomEvent('hud-feedback',{detail:{text,color,combo}}));$('judgment').textContent=text.charAt(0).toLocaleUpperCase('ru-RU')+text.slice(1).toLocaleLowerCase('ru-RU');$('judgment').style.color=color;$('judgment').style.opacity=1;feedbackUntil=performance.now()+500}
const starGlow = document.createElement('div');
starGlow.className = 'star-edge-glow';
starGlow.setAttribute('aria-hidden', 'true');
root.append(starGlow);
let earnedStars = 0;
let starGlowAnimation;
function flashStarEdges() {
  starGlowAnimation?.cancel();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  starGlowAnimation = starGlow.animate([
    {opacity: 0},
    {opacity: reduced ? .35 : 1, offset: .18},
    {opacity: reduced ? .2 : .65, offset: .4},
    {opacity: 0}
  ], {duration: reduced ? 500 : 850, easing: 'ease-out'});
}
function updateHUD(){const r=starProgress(hits,notes.length);window.dispatchEvent(new CustomEvent('hud-progress',{detail:{percent:r.percent,stars:r.stars,score,combo,state}}));if(state==='playing'&&r.stars>earnedStars)flashStarEdges();earnedStars=r.stars;$('score').textContent=score.toLocaleString('ru-RU');$('multiplier').textContent='×'+tourMultiplier(combo);$('streak').textContent=combo>=5?`${combo} подряд`:'';$('meter').style.setProperty('--progress',r.percent+'%');$('meter').setAttribute('aria-valuenow',String(Math.round(r.percent)));$('meter').setAttribute('aria-valuetext',`${Math.floor(r.percent)}% нот трека сыграно, ${r.stars} из 3 звёзд`);document.querySelectorAll('.star').forEach((s,i)=>s.classList.toggle('earned',r.stars>i))}
async function start(){if(starting)return;if(!chart){load();return}starting=true;lastCountdownBeat=-1;$('menu').hidden=true;$('result').hidden=true;$('countdown').textContent='3';$('start').disabled=true;$('again').disabled=true;$('judgment').style.opacity=0;feedbackUntil=0;try{music.stop();const play=music.play();await play;notes=chart.notes.map(n=>({...n,state:'pending'}));score=combo=maxCombo=hits=0;earnedStars=0;starGlowAnimation?.cancel();offset=Number($('offset').value)/1000;active.clear();sparks.length=0;pressedNotes.length=0;flashes.fill(0);setState('playing');$('start').blur();$('again').blur();updateHUD()}catch(e){setState('ready');$('status').textContent='Не удалось включить звук. Нажми «Начать тур» ещё раз.'}finally{starting=false;$('start').disabled=false;$('again').disabled=false}}
function complete(n){n.state='hit';score+=50*n.holdMultiplier;feedback('УДЕРЖАНО',theme.colors[n.lane]);sparks.push({lane:n.lane,at:performance.now()});updateHUD()}
function resetInputs(){for(const n of notes)if(n.state==='holding'){n.state='broken';combo=0}active.clear();flashes.fill(0);updateHUD()}
function pause(){if(state!=='playing')return;setState('paused');music.pause();active.clear();$('resume').focus()}
async function resume(){if(starting)return;starting=true;try{await music.play();for(const n of notes)if(n.state==='holding')n.grace=clock()+.4;setState('playing');$('resume').blur()}catch{$('pause-error').textContent='Не удалось продолжить. Попробуй ещё раз.'}finally{starting=false}}
function home(){if(fromMap){setState('ready');music.stop();resetInputs();notifyMap({type:'level-game-return'});return}setState('ready');music.stop();resetInputs();$('countdown').textContent='';$('judgment').style.opacity=0;best();$('start').focus()}
function finish(){if(state!=='playing')return;setState('ended');music.pause();active.clear();const r=starProgress(hits,notes.length);if(mapLevel)notifyMap({type:'level-game-result',level:mapLevel,stars:r.stars});storage.set(key(),Math.max(score,Number(storage.get(key()))));storage.set(key()+'.stars',Math.max(r.stars,Number(storage.get(key()+'.stars'))));showResult({level:mapLevel||1,score,percent:r.percent,combo:maxCombo,stars:r.stars});$('again').focus()}
function miss(text='МИМО'){combo=0;feedback(text,'#dbb9ee');updateHUD()}
function noteTapFeedback(n) {
  // A successful hit only: do not buzz for empty taps or automatically completed holds.
  impact();
  n.pressedAt = performance.now();
  if (!n.duration) {
    const y=theme.hit-(n.time-clock())/theme.travel*(theme.hit-theme.horizon);
    pressedNotes.push({lane:n.lane,y,at:n.pressedAt});
  }
}
function drawPressedNote(lane,y,age,{holding=false}={}) {
  // Quick compression, then a soft release. Held notes stay slightly depressed.
  const down=Math.min(1,Math.max(0,age)/.065);
  const release=Math.min(1,Math.max(0,age-.065)/.155);
  const compression=age<.065?down:1-release;
  const scale=reducedNoteMotion.matches?1:1-.24*compression-(holding?.09*release:0);
  const p=project(lane,y,w,h,theme);
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(scale,scale);ctx.translate(-p.x,-p.y);
  drawNote(ctx,w,h,theme,lane,y,{holding,alpha:holding?1:1-release});
  ctx.restore();
}
function press(lane,id){if(state!=='playing'||active.has(id)||[...active.values()].includes(lane))return;active.set(id,lane);flashes[lane]=performance.now()+150;const holding=notes.find(n=>n.lane===lane&&n.state==='holding');if(holding)return;const n=nearest(notes,lane,clock());if(!n){if(clock()>=3)miss();return}noteTapFeedback(n);const q=judge(clock()-n.time);combo++;hits++;maxCombo=Math.max(combo,maxCombo);n.holdMultiplier=tourMultiplier(combo);score+=Math.round(100*({perfect:1,good:.8,ok:.55}[q])*n.holdMultiplier);n.state=n.duration?'holding':'hit';feedback(q==='perfect'?'ИДЕАЛЬНО':q==='good'?'ОТЛИЧНО':'В РИТМ',q==='perfect'?'#fff1c9':theme.colors[lane]);sparks.push({lane,at:performance.now()});updateHUD()}
function release(id){const lane=active.get(id);active.delete(id);if(lane===undefined||state!=='playing')return;const n=notes.find(n=>n.lane===lane&&n.state==='holding');if(n){if(clock()>=n.end-.12)complete(n);else{n.state='broken';miss('ОБРЫВ')}}}
canvas.onpointerdown=e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(y<h*(theme.hit-theme.zoneHeight/2)||y>h*(theme.hit+theme.zoneHeight/2))return;canvas.setPointerCapture(e.pointerId);press(laneAt(x,y,w,h,theme),'p'+e.pointerId)};
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>release('p'+e.pointerId));
const keys={KeyC:0,KeyB:1,KeyM:2,ArrowLeft:0,ArrowDown:1,ArrowRight:2};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.code==='Escape'||e.code==='Space'&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();state==='playing'?pause():state==='paused'?resume():null;return}if(keys[e.code]!==undefined&&state==='playing'){e.preventDefault();if(!e.repeat)press(keys[e.code],e.code)}});window.addEventListener('keyup',e=>release(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});media.addEventListener('ended',finish);media.addEventListener('error',()=>{if(state==='playing'){pause();$('pause-error').textContent='Ошибка воспроизведения. Вернись к началу и повтори тур.'}});
$('start').onclick=start;$('again').onclick=()=>{const won=starProgress(hits,notes.length).stars>0;if(won){const next=(mapLevel||1)%12+1;if(fromMap){notifyMap({type:'level-game-next',level:next});return}mapLevel=next;selectTrack(trackForLevel(tracks,next))}start()};$('pause').onclick=pause;$('resume').onclick=resume;$('leave').onclick=()=>{if(fromMap)home();else location.href='levels.html'};$('home').onclick=()=>{if(fromMap)home();else location.href='levels.html'};
function frame(now){requestAnimationFrame(frame);if(state==='paused'||state==='ended')return;ctx.clearRect(0,0,w,h);drawRoad(ctx,w,h,theme);drawZone(ctx,w,h,theme,flashes.map(t=>t>now));const t=clock();
 if(state==='playing'){
  for(const n of notes){if(n.state==='pending'&&t-n.time>WINDOW){n.state='miss';miss('ПРОМАХ')}else if(n.state==='holding'){if(t>=n.end-.04)complete(n);else if(![...active.values()].includes(n.lane)&&t>(n.grace||0)){n.state='broken';miss('ОБРЫВ')}}}
  const beat=Math.min(3,Math.floor(music.currentTime*countdownRate));if(beat!==lastCountdownBeat){lastCountdownBeat=beat;impact(beat===3?'heavy':'light')}
  if(music.currentTime>=duration)finish();$('countdown').textContent=music.currentTime<countdownDuration?String(Math.ceil(3-music.currentTime*countdownRate)):'';
 }
 const shown=state==='ready'?[{lane:1,time:t+2,duration:0,state:'pending'},{lane:0,time:t+1.35,duration:0,state:'pending'},{lane:2,time:t+.8,duration:0,state:'pending'}]:notes;
 for(const n of [...shown].reverse()){if(!['pending','holding'].includes(n.state))continue;const delta=n.time-t;if(delta>theme.travel||delta<-.5&&n.state!=='holding')continue;const y=n.state==='holding'?theme.hit:theme.hit-delta/theme.travel*(theme.hit-theme.horizon);if(n.duration)drawHold(ctx,w,h,theme,n.lane,y,Math.max(theme.horizon,theme.hit-(n.end-t)/theme.travel*(theme.hit-theme.horizon)));if(n.state==='holding')drawPressedNote(n.lane,y,(now-n.pressedAt)/1000,{holding:true});else drawNote(ctx,w,h,theme,n.lane,y);}
 for(let i=pressedNotes.length-1;i>=0;i--){const n=pressedNotes[i],age=(now-n.at)/1000;if(age>.22||state!=='playing')pressedNotes.splice(i,1);else drawPressedNote(n.lane,n.y,age);}
 for(let i=sparks.length-1;i>=0;i--){const s=sparks[i],age=(now-s.at)/1000;if(age>.45)sparks.splice(i,1);else drawSpark(ctx,w,h,theme,s.lane,age)}
 if(now>feedbackUntil){$('judgment').style.opacity=1;$('judgment').textContent='Ваш счёт';$('judgment').style.color=''}const orbit=document.querySelector('#orbit');orbit.classList.toggle('counting',(state==='ready'||(state==='playing'||state==='paused')&&music.currentTime<countdownDuration));if(state==='ready')$('countdown').textContent='3';orbit.style.setProperty('--countdown-angle',`${(Math.max(0,music.currentTime)*countdownRate%1)*360}deg`);
}
if (fromMap) {
  const mapLink = document.querySelector('a[href="levels.html"]');
  mapLink.textContent = 'На карту';
  mapLink.onclick = event => { event.preventDefault(); home(); };
  document.querySelector('a[href="ui-kit.html"]').hidden = true;
  // Expose only the same-origin entry point used by the map's tap handler.
  window.levelGame = {ready:false, pause, back:home, start(level) {
    if (!Number.isInteger(level) || level < 1 || level > 12) return;
    mapLevel = level;
    selectTrack(trackForLevel(tracks,level));
    document.querySelector('#menu .eyebrow').textContent = `Game Kids · уровень ${level}`;
    document.querySelector('#result-level').textContent = `Уровень ${level}`;
    root.setAttribute('aria-label', `Зимний ритм · уровень ${level}`);
    start();
  }};
}
load().then(() => {if(fromMap)window.levelGame.ready=!!chart;if(chart)notifyMap({type:'level-game-ready'});});requestAnimationFrame(frame);

