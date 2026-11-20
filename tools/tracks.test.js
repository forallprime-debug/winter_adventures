import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {trackForLevel} from '../tracks.js';
import {preparedChart} from '../rhythm.js';
const tracks=JSON.parse(await readFile(new URL('../tracks.json',import.meta.url),'utf8'));
test('Levels 1–4 use assigned tracks; later levels sample the entire pool',()=>{
 for(let level=1;level<=4;level++)assert.equal(trackForLevel(tracks,level,()=>.99),tracks[level-1]);
 for(let level=5;level<=12;level++)for(let index=0;index<4;index++)assert.equal(trackForLevel(tracks,level,()=>index/4),tracks[index]);
});
test('Every song has real audio and playable, separated notes in both modes',async()=>{
 for(const track of tracks){
  assert.ok((await stat(new URL('../'+track.audio,import.meta.url))).size>100000);
  const bundle=JSON.parse(await readFile(new URL('../'+track.chart,import.meta.url),'utf8'));
  assert.equal(bundle.audio,track.audio);assert.equal(bundle.title,track.title);assert.equal(bundle.duration,90);
  for(const mode of ['classic','pulse']){
   const chart=preparedChart(bundle,90,mode);assert.ok(chart.notes.length>50,track.id+mode);
   assert.equal(new Set(chart.notes.map(n=>n.lane)).size,3);
   for(const [i,n] of chart.notes.entries()){
    assert.ok(n.time>=3&&n.end<=88.5&&n.end>=n.time);assert.ok(n.lane>=0&&n.lane<3);
    if(i)assert.ok(n.time-chart.notes[i-1].time>=.35-1e-8);
   }
  }
 }
});
