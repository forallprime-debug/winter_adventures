import test from 'node:test';
import assert from 'node:assert/strict';
import {angularGoldColor,angularGoldPaint} from '../ring-angular.js';
import {RESULT_RING} from '../results-ring.js';
test('Angular gold matches Figma stops and wraps continuously at six o’clock',()=>{
 assert.deepEqual(angularGoldColor(.02),[254,194,7]);
 assert.deepEqual(angularGoldColor(.29),[254,194,7]);
 assert.deepEqual(angularGoldColor(.49),[246,110,38]);
 assert.deepEqual(angularGoldColor(0),angularGoldColor(1));
 assert.ok(angularGoldColor(.75)[0]>246);
});
test('Angular paint stays vector and uses one smooth circular reveal',()=>{
 assert.equal((angularGoldPaint().match(/<path /g)||[]).length,96);
 assert.doesNotMatch(RESULT_RING,/<foreignObject|<image|data:image/);
 assert.doesNotMatch(RESULT_RING,/id="resultGold"/);
 assert.match(RESULT_RING,/class="result-arc-reveal"/);
});

test('Gameplay ring uses isolated IDs and no results-only star cutouts',async()=>{
 const {createProgressRing}=await import('../results-ring.js');
 const svg=createProgressRing('game');
 assert.match(svg,/id="game-resultArcMask"/);
 assert.match(svg,/mask="url\(#game-resultArcMask\)"/);
 assert.doesNotMatch(svg,/mask="url\(#game-resultStarsMask\)"/);
 assert.match(RESULT_RING,/mask="url\(#resultStarsMask\)"/);
});
