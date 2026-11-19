import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BOSSES,preparationKey,outcome} from '../bosses.js';
import {preparedChart} from '../rhythm.js';
import {portraitHTML,revealPortrait,createCoverPreloader} from '../screens.js';
import {BOSS_ART} from '../boss-art.js';
for(const boss of BOSSES){
  test(`${boss.id}: maps correspond to this recording and work at both lengths`,()=>{
    const map=JSON.parse(fs.readFileSync(new URL(`../${boss.chart}`,import.meta.url)));
    assert.ok(Math.abs(map.duration-boss.duration)<.1);
    assert.ok(fs.statSync(new URL(`../${boss.shortAudio}`,import.meta.url)).size>0);
    for(const mode of ['classic','pulse','vocal'])for(const duration of [90,map.duration]){
      const chart=preparedChart(map,duration,mode);assert.ok(chart.notes.length>20);
      for(const n of chart.notes){assert.ok(n.time>=3&&n.end<=duration);assert.ok(n.lane>=0&&n.lane<=2)}
    }
    for(const path of [boss.battle,...Object.values(BOSS_ART[boss.id])])assert.ok(fs.statSync(new URL(`../${path}`,import.meta.url)).size>0,path);
    assert.ok(boss.source.startsWith(`Music/${String(BOSSES.indexOf(boss)+1).padStart(2,'0')} `));
    for(const variant of ['start','victory'])for(const match of portraitHTML(boss,variant).matchAll(/src="([^"]+)"/g))assert.ok(fs.existsSync(new URL(`../${match[1]}`,import.meta.url)),match[1]);
  });
}
test('Switching bosses, length or layout cannot reuse the wrong prepared chart',()=>{
  const keys=new Set(BOSSES.flatMap(boss=>['90','full'].flatMap(length=>['vocal','pulse','classic'].map(mode=>preparationKey(boss,length,mode)))));
  assert.equal(keys.size,BOSSES.length*6);
});
test('Results use points for stars, independently of hit percentage',()=>{
  for(const boss of BOSSES){
    const win=outcome('survived',boss,{score:850,hits:70,total:100,combo:18,maximum:1000});
    assert.equal(win.victory,true);assert.equal(win.stars,3);assert.equal(win.accuracy,'70%');
    const loss=outcome('win',boss,{score:399,hits:100,total:100,combo:20,maximum:1000});
    assert.equal(loss.victory,false);assert.equal(loss.stars,0);
  }
});

test('Boss cards contain only the final portrait, without images of previous bosses',()=>{
 const expected={anna:'74',egor:'75',princes:'76',mia:'77',heir:'74'};
 for(const boss of BOSSES){
  const html=portraitHTML(boss);
  const portraits=[...html.matchAll(/src="([^"]*imgImage7[4-7]\.webp)"/g)].map(match=>match[1]);
  assert.deepEqual(portraits,[`assets/figma/cards-${boss.id}-imgImage${expected[boss.id]}.webp`]);
 }
 const egor=portraitHTML(BOSSES.find(b=>b.id==='egor'),'victory');
 assert.ok(!egor.includes('imgImage74.webp'));
});
test('Portrait stays hidden until decoding completes and never reveals a failed image',async()=>{
 let resolve;
 const ready=new Promise(r=>resolve=r);
 const mask={style:{},isConnected:true,querySelectorAll:()=>[{decode:()=>ready}]};
 const pending=revealPortrait({querySelectorAll:()=>[mask]});
 assert.equal(mask.style.visibility,'hidden');
 resolve();await pending;assert.equal(mask.style.visibility,'visible');
 mask.querySelectorAll=()=>[{decode:()=>Promise.reject(new Error('Download failed'))}];
 await revealPortrait({querySelectorAll:()=>[mask]});
 assert.equal(mask.style.visibility,'hidden');
 mask.isConnected=false;mask.querySelectorAll=()=>[{decode:()=>Promise.resolve()}];
 await revealPortrait({querySelectorAll:()=>[mask]});
 assert.equal(mask.style.visibility,'hidden');
});

test('Background cover loading includes only the final portrait, frame and mask and reuses decoded images',async()=>{
 const requests=[];
 const warm=createCoverPreloader(()=>({decode:async()=>{},set src(value){requests.push(value)}}));
 const egor=BOSSES.find(b=>b.id==='egor');
 await warm([egor]);await warm([egor]);
 assert.deepEqual(requests,[BOSS_ART.egor.imgImage75,BOSS_ART.egor.imgFrame,BOSS_ART.egor.imgImage73]);
});
test('A failed background cover does not block other bosses and can be retried',async()=>{
 const requests=[];let fail=true;
 const warm=createCoverPreloader(()=>{
  let src;
  return {set src(value){src=value;requests.push(value)},decode:async()=>{if(fail&&src===BOSS_ART.egor.imgImage75)throw new Error('offline')}};
 });
 const egor=BOSSES.find(b=>b.id==='egor'),mia=BOSSES.find(b=>b.id==='mia');
 await warm([egor,mia]);
 assert.ok(requests.includes(BOSS_ART.mia.imgImage77));
 fail=false;await warm([egor]);
 assert.equal(requests.filter(src=>src===BOSS_ART.egor.imgImage75).length,2);
 assert.equal(requests.filter(src=>src===BOSS_ART.egor.imgFrame).length,1);
});
