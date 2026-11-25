// Figma angular stroke: zero at six o'clock, clockwise; wrap the final stop back to yellow.
const stops=[[.02,[254,194,7]],[.29,[254,194,7]],[.49,[246,110,38]],[1.02,[254,194,7]]];
export function angularGoldColor(position){
 const t=position<.02?position+1:position;
 const end=stops.findIndex(stop=>stop[0]>=t);
 const [a,ca]=stops[Math.max(0,end-1)], [b,cb]=stops[end];
 const mix=b===a?0:(t-a)/(b-a);
 return ca.map((v,i)=>Math.round((v+(cb[i]-v)*mix)*100)/100);
}
export function angularGoldPaint(){
 const count=96,defs=[],sectors=[];
 const point=(angle,r)=>[105+r*Math.cos(angle),105+r*Math.sin(angle)].map(n=>Number(n.toFixed(4)));
 for(let i=0;i<count;i++){
  const start=Math.PI/2+i*2*Math.PI/count,end=start+2*Math.PI/count;
  const a=point(start,94),b=point(end,94),outerA=point(start,150),outerB=point(end+.0003,150);
  const id=`resultGoldSector${i}`;
  defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><stop stop-color="rgb(${angularGoldColor(i/count).join(',')})"/><stop offset="1" stop-color="rgb(${angularGoldColor((i+1)/count).join(',')})"/></linearGradient>`);
  // Only the native circular mask defines the edges: overlapping fans avoid seams at every resize.
  sectors.push(`<path d="M105 105L${outerA.join(' ')}A150 150 0 0 1 ${outerB.join(' ')}Z" fill="url(#${id})"/>`);
 }
 return `<g stroke="none"><defs>${defs.join('')}</defs>${sectors.join('')}</g>`;
}
