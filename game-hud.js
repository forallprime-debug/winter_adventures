import {createProgressRing} from './results-ring.js?v=angular-game-11';
import {STAR_RATES} from './scoring.js';
const orbit=document.querySelector('#orbit'),meter=document.querySelector('#meter');

meter.innerHTML=createProgressRing('game');
const reveal=meter.querySelector('.result-arc-reveal');
const dotGroup=meter.querySelector('.result-vector-checkpoints');
const thresholds=STAR_RATES.map(rate=>rate*100);
// The same thresholds drive both marker positions and earned stars.
for(const percent of [0,...thresholds]){
 const angle=(180+percent*3.6)*Math.PI/180;
 const point=document.createElementNS('http://www.w3.org/2000/svg','circle');
 point.setAttribute('cx',105+94*Math.sin(angle));point.setAttribute('cy',105-94*Math.cos(angle));point.setAttribute('r','3');
 point.setAttribute('fill','url(#game-resultDot)');point.setAttribute('fill-opacity','.6');dotGroup.append(point);
}
function progress(percent,earnedStars){
 const value=Math.max(0,Math.min(100,percent));
 reveal.setAttribute('stroke-dasharray',`${value} 100`);reveal.setAttribute('opacity',value>0?'1':'0');
 meter.setAttribute('aria-valuenow',Math.round(value));
 document.querySelectorAll('.orbit-stars .star').forEach((star,i)=>{
  const before=star.classList.contains('earned');star.classList.toggle('earned',earnedStars>i);
  if(!before&&earnedStars>i)star.animate([{scale:1},{scale:1.35},{scale:1}],{duration:550});
 });
}
function flash(kind){document.querySelector('.combo-label').style.color=kind==='combo'?'#62ff97':kind==='hit'?'#ffda8a':'#a8f2ff'}
window.addEventListener('hud-progress',e=>progress(e.detail.percent,e.detail.stars));
window.addEventListener('hud-feedback',e=>flash(/МИМО|ПРОМАХ|ОБРЫВ/.test(e.detail.text)?'miss':e.detail.combo>=40?'combo':'hit'));

progress(0,0);
