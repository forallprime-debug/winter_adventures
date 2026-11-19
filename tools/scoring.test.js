import test from 'node:test';
import assert from 'node:assert/strict';
import {maximumScore,starProgress,recordKey} from '../scoring.js';
test('Exact star thresholds, including rounding and zero-note maps',()=>{
  for(const [score,stars] of [[0,0],[399,0],[400,1],[649,1],[650,2],[849,2],[850,3],[1000,3]])assert.equal(starProgress(score,1000).stars,stars);
  assert.deepEqual(starProgress(0,101).thresholds,[41,66,86]);
  assert.equal(starProgress(0,0).stars,0);assert.equal(starProgress(1200,1000).percent,100);
});
test('Perfect play reaches the maximum including holds and combo transitions',()=>{
  const notes=Array.from({length:40},(_,i)=>({duration:i%3===0?.5:0}));
  let score=0;
  for(let i=0;i<notes.length;i++){const mult=i<9?1:i<19?2:i<29?3:i<39?4:5;score+=100*mult;if(notes[i].duration)score+=50*mult;}
  assert.equal(maximumScore(notes),score);assert.equal(starProgress(score,score).stars,3);assert.equal(maximumScore([]),0);
});
test('Records are isolated by tour, duration, difficulty and project',()=>{
  const keys=['anna','egor'].flatMap(id=>['90','full'].flatMap(length=>['classic','pulse'].map(mode=>recordKey(id,length,mode))));
  assert.equal(new Set(keys).size,8);assert.ok(keys.every(k=>k.startsWith('game2.stars.v1.')));
});

test('Hit-based stars: 85% and all hits earn three stars regardless of points',()=>{
 for(const [hits,stars] of [[39,0],[40,1],[64,1],[65,2],[84,2],[85,3],[100,3]])assert.equal(starProgress(hits,100).stars,stars);
 assert.equal(starProgress(168,198).stars,2);
 assert.equal(starProgress(169,198).stars,3);
 assert.equal(starProgress(0,0).stars,0);
});
