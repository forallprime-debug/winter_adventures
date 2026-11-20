import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import vm from 'node:vm';
import {preparedChart} from '../rhythm.js';

test('Published map and game have all local entry-point dependencies', async () => {
  await import('./build-site.js');
  const root = new URL('../_site/', import.meta.url);
  const map = await readFile(new URL('index.html', root), 'utf8');
  assert.match(map, /data-src="game.html\?from=map/);
  assert.doesNotMatch(map, /<iframe[^>]*\ssrc=/);
  assert.match(map, /id="map-loading"/);
  let mapBytes = 0;
  for (const name of ['map', 'character', 'snowman', 'point-current', 'point-future', 'point-done', 'star']) {
    mapBytes += (await stat(new URL(`assets/levels/${name}.webp`, root))).size;
  }
  assert.ok(mapBytes < 600_000, `Map artwork must stay under 600 KB; got ${mapBytes}`);
  assert.doesNotMatch(map, /src="assets\/levels\//);
  assert.doesNotMatch(map, /<link[^>]*stylesheet/);
  assert.doesNotMatch(map, /<script[^>]*src="levels.js/);
  assert.match(map, /window.WinterMapAssets=/);
  assert.ok(Buffer.byteLength(map) < 750_000, 'Single-page map must stay under 750 KB');
  assert.match(map, /telegram.org\/js\/telegram-web-app.js/);
  for (const file of ['game.html', 'levels.js', 'levels.css', 'telegram.js', 'forest-game.js',
    'forest.css', 'game-hud.js', 'game-hud.css', 'assets/game-hud/progress-full.svg', 'assets/game-hud/progress-track.svg', 'assets/game-hud/ticks-uniform.svg', 'assets/game-hud/star.png', 'design/renderer.js', 'design/tokens.css', 'design/components.css',
    'Music/duck-tales-90.m4a', 'assets/winter/landscape-tall.webp',
    ...['cyan', 'violet', 'pink'].map(c => `assets/ui/tiles/ice-${c}.webp`),
    ...['map', 'snowman', 'character', 'point-current', 'point-done', 'point-future', 'star'].map(n => `assets/levels/${n}.webp`)]) {
    assert.ok((await stat(new URL(file, root))).size > 0, file);
  }
  const game = await readFile(new URL('game.html', root), 'utf8');
  assert.doesNotMatch(game, /data-demo|lab-controls|hud-lab/);
  const engine = await readFile(new URL('forest-game.js', root), 'utf8');
  assert.doesNotMatch(engine, /hudLab|lab-test-hit|hits\s*\*\s*5/);
  assert.match(engine, /starProgress\(hits,notes.length\)/);
  const chart = JSON.parse(await readFile(new URL('charts-duck-tales.json', root), 'utf8'));
  for (const mode of ['classic', 'pulse']) assert.ok(preparedChart(chart, 90, mode).notes.length > 0);
});

test('Telegram bridge handles native haptics, back, viewport and deactivation', async () => {
  const calls = [];
  const events = {};
  const props = {};
  let back;
  const app = {initData: 'test', viewportHeight: 700, safeAreaInset: {top: 20},
    contentSafeAreaInset: {top: 40}, isVersionAtLeast: () => true,
    ready() {}, expand() {}, setHeaderColor() {}, setBackgroundColor() {}, setBottomBarColor() {},
    disableVerticalSwipes() {}, onEvent: (name, fn) => {events[name] = fn;},
    BackButton: {show: () => calls.push('show'), hide: () => calls.push('hide'), onClick: fn => {back = fn;}},
    HapticFeedback: {impactOccurred: value => calls.push(value)}};
  const window = {Telegram: {WebApp: app}, addEventListener() {}};
  window.parent = window;
  const context = vm.createContext({window, navigator: {}, document: {
    documentElement: {style: {setProperty: (key, value) => {props[key] = value;}}},
    querySelector: () => ({contentWindow: {levelGame: {pause: () => calls.push('pause')}}})
  }});
  const source = (await readFile(new URL('../telegram.js', import.meta.url), 'utf8')).replaceAll('export ', '');
  vm.runInContext(source, context);
  vm.runInContext("setTelegramBack(() => window.returned = true); impact();", context);
  back();
  events.deactivated();
  assert.equal(window.returned, true);
  assert.deepEqual(calls, ['hide', 'show', 'light', 'pause']);
  assert.equal(props['--app-height'], '700px');
  assert.equal(props['--app-safe-top'], '40px');
  vm.runInContext('setTelegramBack(null)', context);
  assert.equal(calls.at(-1), 'hide');
});

test('Telegram SDK may arrive after the map without losing the back handler', async () => {
  const listeners = {};
  const calls = [];
  const window = {addEventListener: (event, callback) => {listeners[event] = callback;}};
  window.parent = window;
  const context = vm.createContext({window, navigator: {}, document: {
    documentElement: {style: {setProperty() {}}}, querySelector() {}
  }});
  const source = (await readFile(new URL('../telegram.js', import.meta.url), 'utf8')).replaceAll('export ', '');
  vm.runInContext(source, context);
  vm.runInContext('setTelegramBack(() => window.returned = true)', context);
  let back;
  window.Telegram = {WebApp: {initData: 'test', isVersionAtLeast: () => true,
    ready: () => calls.push('ready'), expand() {}, onEvent() {},
    BackButton: {onClick: callback => {back = callback;}, show: () => calls.push('show')},
    HapticFeedback: {impactOccurred: style => calls.push(style)}}};
  listeners['telegram-ready']();
  listeners['telegram-ready']();
  back();
  vm.runInContext('impact()', context);
  assert.equal(window.returned, true);
  assert.deepEqual(calls, ['ready', 'show', 'light']);
});
