import test from 'node:test';
import assert from 'node:assert/strict';
import {project,roadWidth,laneAt,noteGeometry,spriteRow,SLAB} from '../design/renderer.js';
import {tourMultiplier} from '../scoring.js';
const t={farWidth:.28,roadWidth:1.08,horizon:.35,hit:.84};
test('Perspective and input lane agree across viewport sizes and hit area',()=>{
 for(const [w,h] of [[390,844],[360,640],[560,1100]])for(const y of [.765,.84,.915]){
  const centers=[0,1,2].map(l=>project(l,y,w,h,t));
  assert.ok(centers[0].x<centers[1].x&&centers[1].x<centers[2].x);
  centers.forEach((p,l)=>assert.equal(laneAt(p.x,p.y,w,h,t),l));
  assert.ok(roadWidth(y,t)>roadWidth(t.horizon,t));
 }
});
test('Forest multiplier reaches five and caps there',()=>{
 for(const [combo,m] of [[0,1],[9,1],[10,2],[30,4],[39,4],[40,5],[200,5]])assert.equal(tourMultiplier(combo),m);
});

test('Tile corners stay at a fixed inset inside their lane throughout flight',()=>{
 const theme={...t,noteHeight:.093,noteWidth:.86};
 for(const [w,h] of [[390,844],[1064,1190]])for(const lane of [0,1,2])for(const y of [.35,.5,.7,.84,.96]){
  const {pts}=noteGeometry(w,h,theme,lane,y);
  for(const [i,[x,py]] of pts.entries()){
   const center=project(lane,py/h,w,h,theme);
   const side=i===0||i===3?-1:1;
   assert.ok(Math.abs(x-(center.x+side*center.width*theme.noteWidth/2))<1e-8);
   assert.equal(laneAt(x,py,w,h,theme),lane);
  }
 }
});

test('Baked slab marker aligns with hit line at every lane and viewport size',()=>{
 const theme={...t,noteHeight:.093,noteWidth:.86};
 for(const [w,h] of [[360,640],[390,844],[560,1100]])for(const lane of [0,1,2]){
  const row=spriteRow(w,h,theme,lane,theme.hit,SLAB.marker);
  assert.equal(row.y,theme.hit*h);
  assert.equal(row.centerX,project(lane,theme.hit,w,h,theme).x);
  const face=spriteRow(w,h,theme,lane,theme.hit,SLAB.front);
  const edge=spriteRow(w,h,theme,lane,theme.hit,.92);
  assert.equal(edge.width,face.width);
  assert.equal(edge.centerX,face.centerX);
  assert.ok(edge.y>face.y);
 }
});
