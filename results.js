import {STAR_RATES} from './scoring.js';
let activeAnimation;
export function showResult({level=1,score=0,percent=0,combo=0,stars=0}, root=document){
 activeAnimation?.();
 const result=root.querySelector('#result');
 const win=stars>0;result.dataset.outcome=win?'win':percent>0?'retry':'zero';
 root.querySelector('#result-level').textContent=`Уровень ${level}`;
 root.querySelector('#result-title').textContent=win?'Ура! Это победа!':percent>0?'В этот раз не вышло. Попробуем снова?':'Поймаем ритм с новой попытки?';
 root.querySelector('#result-character').src=`assets/results/character-${win?'win':'retry'}.webp?v=figma-original-3`;
 let ring=root.querySelector('#result-ring');
 if(ring.tagName==='IMG'){
  const replacement=root.createElement('div');replacement.id='result-ring';ring.replaceWith(replacement);ring=replacement;
 }
 ring.innerHTML='<img class="result-track" src="assets/results/ring-track.svg" alt=""><div class="result-fill"><div class="result-fill-color"></div></div><div class="result-checkpoints"></div>';
 const fill=ring.querySelector('.result-fill');
 const markers=[0,...STAR_RATES.map(rate=>rate*100)].map(value=>{
  const angle=(180+value*3.6)*Math.PI/180;
  const point=root.createElement('img');point.src='assets/game-hud/checkpoint.svg';point.alt='';point.className='result-checkpoint';
  point.style.left=`${50+44.7619*Math.sin(angle)}%`;point.style.top=`${50-44.7619*Math.cos(angle)}%`;
  ring.querySelector('.result-checkpoints').append(point);return {point,value};
 });
 root.querySelector('#result-score').textContent=score.toLocaleString('ru-RU');
 root.querySelector('#result-accuracy').textContent=`${Math.floor(percent)}%`;
 root.querySelector('#result-combo').textContent=combo;
 const group=root.querySelector('#result-stars');group.setAttribute('aria-label',`${stars} из 3 звёзд`);
 group.innerHTML=Array.from({length:3},()=>'<img src="assets/results/star-idle.webp?v=figma-idle-4" alt="" width="52" height="52" class="idle">').join('');
 const starImages=[...group.children];
 root.querySelector('#again-label').textContent=win?'Следующий':'Ещё раз';
 result.hidden=false;
 const target=Math.max(0,Math.min(100,percent));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const character=root.querySelector('#result-character');
 const entrance=reduced?null:character.animate([{opacity:0,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:320,easing:'ease-out',fill:'backwards'});
 function render(value,fraction=0){
  root.querySelector('#result-score').textContent=Math.round(score*fraction).toLocaleString('ru-RU');
  const mask=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 210"><circle cx="105" cy="105" r="94" fill="none" stroke="white" stroke-width="22" stroke-linecap="round" pathLength="100" stroke-dasharray="${value} 100" transform="rotate(90 105 105)" opacity="${value>0?1:0}"/></svg>`;
  fill.style.setProperty('--result-mask',`url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
  markers.forEach(({point,value:threshold})=>point.classList.toggle('reached',threshold>0&&value>=threshold));
  starImages.forEach((star,i)=>{
   if(i<stars&&value>=STAR_RATES[i]*100&&!star.classList.contains('earned')){
    star.src='assets/results/star.webp';star.className='earned';
    if(!reduced)star.animate([{scale:1},{scale:1.22,offset:.4},{scale:1}],{duration:240,easing:'ease-out'});
   }
  });
 }
 render(0);
 let frame;let cancelled=false;const started=performance.now();
 function tick(now){if(cancelled)return;const elapsed=Math.max(0,now-started-320);const fraction=reduced?1:Math.min(1,elapsed/800);render(target*fraction,fraction);if(fraction<1)frame=requestAnimationFrame(tick)}
 frame=requestAnimationFrame(tick);
 activeAnimation=()=>{cancelled=true;cancelAnimationFrame(frame);entrance?.cancel();starImages.forEach(star=>star.getAnimations().forEach(animation=>animation.cancel()))};
}
