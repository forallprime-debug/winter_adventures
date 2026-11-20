// Fixed songs for the first four levels; later levels pick a song per visit.
export function trackForLevel(tracks,level,random=Math.random){
 if(!Array.isArray(tracks)||!tracks.length)throw new Error('Нет треков');
 return level>=1&&level<=4?tracks[(level-1)%tracks.length]:tracks[Math.min(tracks.length-1,Math.floor(random()*tracks.length))];
}
