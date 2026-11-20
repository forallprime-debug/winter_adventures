import {STAR_RATES} from './scoring.js';
const orbit=document.querySelector('#orbit'),meter=document.querySelector('#meter');

const thresholds=STAR_RATES.map(rate=>rate*100);
// The same thresholds drive both marker positions and earned stars.
for(const percent of [0,...thresholds]){const angle=(180+percent*3.6)*Math.PI/180;const point=document.createElement('img');point.src='assets/game-hud/checkpoint.svg';point.width=6;point.height=6;point.alt='';point.className='checkpoint';point.dataset.percent=percent;point.style.left=`${50+45*Math.sin(angle)}%`;point.style.top=`${50-45*Math.cos(angle)}%`;document.querySelector('.checkpoints').append(point)}
function progress(percent,earnedStars){meter.style.setProperty('--progress',percent);meter.style.setProperty('--ring-angle',`${percent*3.6}deg`);const arcMask=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 210"><circle cx="105" cy="105" r="94.5" fill="none" stroke="white" stroke-width="21" stroke-linecap="round" pathLength="100" stroke-dasharray="${Math.max(0,Math.min(100,percent))} 100" transform="rotate(90 105 105)" opacity="${percent>0?1:0}"/></svg>`;meter.style.setProperty('--arc-mask',`url("data:image/svg+xml,${encodeURIComponent(arcMask)}")`);meter.setAttribute('aria-valuenow',Math.round(percent));document.querySelectorAll('.orbit-stars .star').forEach((star,i)=>{const before=star.classList.contains('earned');star.classList.toggle('earned',earnedStars>i);if(!before&&earnedStars>i)star.animate([{scale:1},{scale:1.35},{scale:1}],{duration:550})});document.querySelectorAll('.checkpoint').forEach((p,i)=>p.classList.toggle('reached',percent>=Number(p.dataset.percent)))}
function flash(kind){document.querySelector('.combo-label').style.color=kind==='combo'?'#62ff97':kind==='hit'?'#ffda8a':'#a8f2ff'}
window.addEventListener('hud-progress',e=>progress(e.detail.percent,e.detail.stars));
window.addEventListener('hud-feedback',e=>flash(/МИМО|ПРОМАХ|ОБРЫВ/.test(e.detail.text)?'miss':e.detail.combo>=40?'combo':'hit'));

progress(0,0);
