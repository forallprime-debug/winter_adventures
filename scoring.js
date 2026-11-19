export function tourMultiplier(combo){return Math.min(5,1+Math.floor(combo/10))}
export const STAR_RATES = [.4, .65, .85];
// Holds lock their bonus multiplier at the initial hit, so the maximum is exact.
export function maximumScore(notes) {
  return notes.reduce((total,n,i)=>total+(100+(n.duration>0?50:0))*tourMultiplier(i+1),0);
}
export function starProgress(score,maximum) {
  const thresholds=STAR_RATES.map(rate=>Math.ceil(Math.max(0,maximum||0)*rate));
  return {thresholds,stars:maximum>0?thresholds.filter(t=>score>=t).length:0,percent:maximum>0?Math.max(0,Math.min(100,score/maximum*100)):0};
}
export function recordKey(tour,length,mode){return `game2.stars.v1.${tour}.${length}.${mode}`}
