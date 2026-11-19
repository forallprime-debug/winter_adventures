// Shared by gameplay and UI-kit. Geometry is normalized to the screen.
export function readTheme(element){
 const css=getComputedStyle(element),num=n=>Number(css.getPropertyValue('--'+n));
 return {colors:['cyan','violet','pink'].map(n=>css.getPropertyValue('--'+n).trim()),line:css.getPropertyValue('--lane-line').trim(),zoneOpacity:num('zone-opacity'),inset:num('zone-inset'),zoneHeight:num('zone-height'),hit:num('hit-position'),horizon:num('horizon'),farWidth:num('horizon-width'),roadWidth:num('road-width'),noteWidth:num('note-width'),noteHeight:num('note-height'),travel:num('note-travel')};
}
export function roadWidth(y,t){return t.farWidth+(t.roadWidth-t.farWidth)*(y-t.horizon)/(1-t.horizon)}
export function project(lane,y,w,h,t){const span=roadWidth(y,t)*w;return {x:w/2+(lane-1)*span/3,y:y*h,width:span/3}}
export function laneAt(x,y,w,h,t){const span=roadWidth(y/h,t)*w;return Math.max(0,Math.min(2,Math.floor((x-(w-span)/2)/(span/3))))}
function polygon(ctx,pts,r=8){ctx.beginPath();for(let i=0;i<pts.length;i++){const prev=pts[(i+pts.length-1)%pts.length],p=pts[i],next=pts[(i+1)%pts.length];const d1=Math.hypot(prev[0]-p[0],prev[1]-p[1]),d2=Math.hypot(next[0]-p[0],next[1]-p[1]);const a=[p[0]+(prev[0]-p[0])*Math.min(r/d1,.2),p[1]+(prev[1]-p[1])*Math.min(r/d1,.2)],b=[p[0]+(next[0]-p[0])*Math.min(r/d2,.2),p[1]+(next[1]-p[1])*Math.min(r/d2,.2)];if(i===0)ctx.moveTo(...a);else ctx.lineTo(...a);ctx.quadraticCurveTo(...p,...b)}ctx.closePath()}
function areaPoints(w,h,t){const top=t.hit-t.zoneHeight/2,bottom=t.hit+t.zoneHeight/2;return [[(1-roadWidth(top,t))/2*w+t.inset*w,top*h],[(1+roadWidth(top,t))/2*w-t.inset*w,top*h],[(1+roadWidth(bottom,t))/2*w-t.inset*w,bottom*h],[(1-roadWidth(bottom,t))/2*w+t.inset*w,bottom*h]]}
export function drawRoad(ctx,w,h,t){
 ctx.save();const top=t.horizon*h;
 const g=ctx.createLinearGradient(0,top,0,h);g.addColorStop(0,'#c8f5ff0a');g.addColorStop(1,'#307da020');
 polygon(ctx,[[(1-t.farWidth)*w/2,top],[(1+t.farWidth)*w/2,top],[(1+t.roadWidth)*w/2,h],[(1-t.roadWidth)*w/2,h]],0);ctx.fillStyle=g;ctx.fill();
 ctx.strokeStyle=t.line;ctx.shadowColor=t.line;ctx.shadowBlur=6;ctx.lineWidth=1.2;
 for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(w/2+(i/3-.5)*t.farWidth*w,top);ctx.lineTo(w/2+(i/3-.5)*t.roadWidth*w,h);ctx.stroke()}ctx.restore();
}
export function drawZone(ctx,w,h,t,active=[]){
 ctx.save();const pts=areaPoints(w,h,t);polygon(ctx,pts,14);ctx.fillStyle=`rgba(192,233,255,${t.zoneOpacity})`;ctx.fill();ctx.strokeStyle='#e5faffdd';ctx.lineWidth=1.1;ctx.shadowColor='#50d5ff';ctx.shadowBlur=5;ctx.stroke();ctx.shadowBlur=0;ctx.clip();
 for(let lane=0;lane<3;lane++)if(active[lane]){const p=project(lane,t.hit,w,h,t);ctx.fillStyle=t.colors[lane]+'55';ctx.fillRect(p.x-p.width/2,0,p.width,h)}
 const span=roadWidth(t.hit,t)*w;ctx.beginPath();ctx.moveTo((w-span)/2+t.inset*w,t.hit*h);ctx.lineTo((w+span)/2-t.inset*w,t.hit*h);ctx.strokeStyle='#f4e9ff';ctx.shadowColor='#b1efff';ctx.shadowBlur=6;ctx.lineWidth=1.6;ctx.stroke();ctx.restore();
}
// Project each edge onto its lane: outer lanes also shear with the road.
export function noteGeometry(w,h,t,lane,y){
 const p=project(lane,y,w,h,t),scale=roadWidth(y,t)/roadWidth(t.hit,t),nh=h*t.noteHeight*scale;
 const edge=at=>{const center=project(lane,at,w,h,t),half=center.width*t.noteWidth/2;return [[center.x-half,center.y],[center.x+half,center.y]]};
 const top=edge(y-nh/(2*h)),bottom=edge(y+nh/(2*h));
 return {p,scale,nh,nw:p.width*t.noteWidth,pts:[top[0],top[1],bottom[1],bottom[0]]};
}
// The approved sprite already contains the complete ice face and realistic front edge.
export const TILE_ASSET=new URL('../assets/ui/tiles/ice-slab.webp',import.meta.url).href;
export const TILE_ASSETS=['cyan','violet','pink'].map(c=>new URL(`../assets/ui/tiles/ice-${c}.webp?v=provided-5`,import.meta.url).href);
export const TILE_FILTERS=['none','none','none'];
const slabImages=typeof Image==='undefined'?[]:TILE_ASSETS.map(src=>{const img=new Image();img.src=src;return img});
const coloredSlabs=[];
export async function loadTileAssets(){
 await Promise.all(slabImages.map(img=>img.decode()));
 for(let lane=0;lane<3;lane++)tileSprite(lane);
}
function tileSprite(lane){
 if(coloredSlabs[lane])return coloredSlabs[lane];
 const img=slabImages[lane];
 if(!img?.complete||!img.naturalWidth)return null;
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*img.naturalHeight/img.naturalWidth);
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
 return coloredSlabs[lane]=canvas;
}
// Source landmarks, measured on ice-slab.webp. Marker is the white stripe centre.
export const SLAB={marker:.418,front:.775,span:.79,taper:.36};
export function spriteRow(w,h,t,lane,y,v){
 const p=project(lane,y,w,h,t),scale=roadWidth(y,t)/roadWidth(t.hit,t);
 const unit=h*t.noteHeight*scale/.88;
 const screenY=p.y+(v-SLAB.marker)*unit;
 // The vertical front edge keeps the width of the front surface, rather than
 // flaring out as if it were additional road. Remove the baked taper first.
 const groundY=y+(Math.min(v,SLAB.front)-SLAB.marker)*unit/h;
 const center=project(lane,groundY,w,h,t);
 const bakedSpan=SLAB.span+SLAB.taper*(Math.min(v,SLAB.front)-SLAB.marker);
 const width=center.width*t.noteWidth/bakedSpan;
 return {x:center.x-width/2,y:screenY,width,unit,centerX:center.x};
}
function drawIceSprite(ctx,img,w,h,t,lane,y,alpha,holding){
 ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=true;
 // One soft contact shadow beneath the whole note, independent of texture strips.
 const base=spriteRow(w,h,t,lane,y,.90),face=spriteRow(w,h,t,lane,y,SLAB.marker);
 ctx.save();ctx.translate(base.centerX,base.y+base.unit*.025);
 ctx.scale(face.width*.79*.47,base.unit*.12);
 const shade=ctx.createRadialGradient(0,0,0,0,0,1);
 shade.addColorStop(0,'rgba(3,22,49,.24)');shade.addColorStop(.45,'rgba(3,22,49,.13)');shade.addColorStop(1,'rgba(3,22,49,0)');
 ctx.fillStyle=shade;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
 // No added extrusion: refraction, bevels and thickness all come from the asset.
 if(holding){ctx.shadowColor=t.colors[lane];ctx.shadowBlur=9}
 const rows=64;
 for(let i=0;i<rows;i++){
  const v=i/rows,r=spriteRow(w,h,t,lane,y,v);
  ctx.drawImage(img,0,v*img.height,img.width,img.height/rows,r.x,r.y,r.width,r.unit/rows+.2);
 }
 ctx.restore();
}
export function drawNote(ctx,w,h,t,lane,y,{holding=false,alpha=1}={}){
 const {p,scale,nh,nw,pts}=noteGeometry(w,h,t,lane,y),c=t.colors[lane],depth=Math.max(2,nh*.09);
 const image=tileSprite(lane);
 if(image){drawIceSprite(ctx,image,w,h,t,lane,y,alpha,holding);return}
 ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor=c;ctx.shadowBlur=holding?22:10;
 ctx.translate(0,depth);polygon(ctx,pts,nh*.18);ctx.fillStyle=c+'99';ctx.fill();ctx.translate(0,-depth);
 polygon(ctx,pts,nh*.18);const g=ctx.createLinearGradient(0,p.y-nh/2,0,p.y+nh/2);g.addColorStop(0,'#effcff');g.addColorStop(.16,c+'dd');g.addColorStop(.55,c+'88');g.addColorStop(1,c+'ee');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#edfcff';ctx.lineWidth=1.5;ctx.stroke();ctx.shadowBlur=0;ctx.save();ctx.clip();
 // Fine frost branches inside the tile, kept away from the timing stripe.
 ctx.strokeStyle='#efffff88';ctx.lineWidth=Math.max(.6,scale);
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const x=p.x+side*nw*(.26+i*.035),y=p.y+nh*(.25-i*.08);
  ctx.beginPath();ctx.moveTo(x-side*nw*.07,y+nh*.06);ctx.lineTo(x,y);ctx.lineTo(x-side*nw*.04,y-nh*.055);ctx.stroke();
 }
 // A small frosted cap follows the projected top edge.
 ctx.beginPath();ctx.moveTo(pts[0][0]+nw*.08,pts[0][1]+2*scale);ctx.lineTo(pts[1][0]-nw*.08,pts[1][1]+2*scale);ctx.strokeStyle='#f7feff';ctx.lineWidth=3*scale;ctx.lineCap='round';ctx.stroke();ctx.restore();
 ctx.beginPath();ctx.roundRect(p.x-nw*.32,p.y-2.2*scale,nw*.64,4.4*scale,4);ctx.fillStyle='white';ctx.shadowColor=c;ctx.shadowBlur=12;ctx.fill();ctx.restore();
}
export function drawHold(ctx,w,h,t,lane,head,tail){
 const a=project(lane,head,w,h,t),b=project(lane,tail,w,h,t);
 ctx.save();polygon(ctx,[[b.x-b.width*.15,b.y],[b.x+b.width*.15,b.y],[a.x+a.width*.15,a.y],[a.x-a.width*.15,a.y]],0);ctx.fillStyle=t.colors[lane]+'66';ctx.fill();
 ctx.strokeStyle=t.colors[lane];ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
}
export function drawSpark(ctx,w,h,t,lane,age){const p=project(lane,t.hit,w,h,t);ctx.save();ctx.globalAlpha=Math.max(0,1-age/.45);ctx.strokeStyle=t.colors[lane];ctx.lineWidth=2;ctx.shadowColor=t.colors[lane];ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(p.x,p.y,p.width*(.15+age),h*.016*(1+age*3),0,0,Math.PI*2);ctx.stroke();ctx.restore()}
