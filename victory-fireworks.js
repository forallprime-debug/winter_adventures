// One short celebration, no downloaded assets or permanent animation loop.
export function victoryFireworks(result){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return ()=>{};
 const canvas=document.createElement('canvas');canvas.className='victory-fireworks';canvas.setAttribute('aria-hidden','true');result.prepend(canvas);
 const ctx=canvas.getContext('2d');if(!ctx){canvas.remove();return ()=>{}};
 const {width:w,height:h}=result.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);
 if(!w||!h){canvas.remove();return ()=>{}};
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.scale(dpr,dpr);
 const colors=['#ffe783','#fff8d5','#78edff','#ff91c9','#c5a1ff'];
 const particles=[],bursts=[{x:w*.21,y:h*.2,at:.65},{x:w*.8,y:h*.26,at:1.15},{x:w*.51,y:h*.13,at:1.7}];
 const random=(a,b)=>a+Math.random()*(b-a);
 for(const side of [-1,1])for(let i=0;i<26;i++)particles.push({x:side<0?-8:w+8,y:h*.65,vx:-side*random(w*.3,w*.95),vy:-random(h*.48,h*.82),g:h*.65,at:.25+i*.009,life:random(2,3),color:colors[i%colors.length],size:random(2,4),type:i%5===0?'star':'paper',angle:random(0,6),spin:random(-6,6)});
 for(const burst of bursts)for(let i=0;i<22;i++){
  const angle=i/22*Math.PI*2,speed=random(w*.14,w*.38);
  particles.push({x:burst.x,y:burst.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,g:h*.065,at:burst.at,life:random(.9,1.5),color:i%3?'#ffe69a':'#fff9e4',size:random(1,2.3),type:'spark'});
 }
 let frame,last=0,stopped=false;const started=performance.now();
 function stop(){if(stopped)return;stopped=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',hidden);canvas.remove()}
 const observer=new MutationObserver(()=>{if(result.hidden)stop()});observer.observe(result,{attributes:true,attributeFilter:['hidden']});
 function hidden(){if(document.hidden)stop()}document.addEventListener('visibilitychange',hidden);
 function star(size){ctx.beginPath();for(let i=0;i<10;i++){const angle=i*Math.PI/5-Math.PI/2,r=i%2?size*.45:size;ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r)}ctx.closePath();ctx.fill()}
 function draw(now){
  if(stopped)return;const elapsed=(now-started)/1000;
  if(elapsed>4){stop();return}frame=requestAnimationFrame(draw);if(now-last<32)return;last=now;
  ctx.clearRect(0,0,w,h);
  for(const burst of bursts){
   const rise=elapsed-burst.at;
   if(rise<0&&rise>-.4){const y=burst.y+(-rise/.4)*h*.23;ctx.globalAlpha=(1+rise/.4)*.7;ctx.strokeStyle='#fff0b7';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(burst.x,y+16);ctx.lineTo(burst.x,y);ctx.stroke()}
   if(rise>=0&&rise<.22){ctx.globalAlpha=(1-rise/.22)*.22;const glow=ctx.createRadialGradient(burst.x,burst.y,0,burst.x,burst.y,35);glow.addColorStop(0,'#fff9d7');glow.addColorStop(1,'#fff9d700');ctx.fillStyle=glow;ctx.fillRect(burst.x-35,burst.y-35,70,70)}
  }
  for(const p of particles){
   const t=elapsed-p.at;if(t<0||t>p.life)continue;
   const drag=p.type==='spark'?1.8:.6,travel=(1-Math.exp(-drag*t))/drag;
   const x=p.x+p.vx*travel,y=p.y+p.vy*travel+p.g*t*t*.5;
   ctx.globalAlpha=Math.min(1,t*12)*Math.min(1,(p.life-t)*1.8);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
   if(p.type==='spark'){
    const previous=Math.max(0,t-.035),old=(1-Math.exp(-drag*previous))/drag;
    ctx.lineWidth=p.size;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x+p.vx*old,p.y+p.vy*old+p.g*previous*previous*.5);ctx.lineTo(x,y);ctx.stroke();
   }else{
    ctx.save();ctx.translate(x,y);ctx.rotate(p.angle+p.spin*t);
    if(p.type==='star')star(p.size*1.5);else{ctx.scale(Math.max(.18,Math.abs(Math.cos(t*5+p.angle))),1);ctx.fillRect(-p.size/2,-p.size,p.size,p.size*2)}ctx.restore();
   }
  }
  ctx.globalAlpha=1;
 }
 frame=requestAnimationFrame(draw);return stop;
}
