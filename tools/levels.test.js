import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../levels.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/, '');

function mapHarness({scores = Array(12).fill(0), reducedMotion = false} = {}) {
  class Element {
    style = {setProperty() {}};
    dataset = {};
    attrs = {};
    children = [];
    animations = [];
    hidden = true;
    setAttribute(name, value) { this.attrs[name] = value; }
    removeAttribute(name) { delete this.attrs[name]; }
    hasAttribute(name) { return name in this.attrs; }
    querySelector(selector) { return this.parts[selector]; }
    addEventListener(type, fn) { this[type] = fn; }
    append(child) { this.children.push(child); }
    focus() {}
    getAnimations() { return this.animations.filter(a => !a.cancelled); }
    animate(frames, options) {
      const animation = {frames, options, cancelled: false, cancel() { this.cancelled = true; }};
      this.animations.push(animation);
      return animation;
    }
  }
  const elements = new Map();
  const get = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  const starts = [];
  get('#level-game').contentWindow = {levelGame: {ready: true, start: n => starts.push(n)}};
  const reduced = {matches: reducedMotion};
  const context = vm.createContext({
    document: {querySelector: get, createElement() {
      const button = new Element();
      button.parts = Object.fromEntries(['.ice', '.level-number', '.level-stars', '.level-lock'].map(s => [s, new Element()]));
      return button;
    }},
    window: {addEventListener() {}},
    localStorage: {getItem: () => JSON.stringify({scores, current: 11})},
    matchMedia: () => reduced,
    ResizeObserver: class {observe() {}},
    Image: class {}, setTimeout() { return 0; }, setTelegramBack() {},
  });
  vm.runInContext(source, context);
  return {buttons: get('#level-points').children, get, starts};
}

test('Locked level clicks restart the eased lock animation without launching or moving', () => {
  const {buttons, get, starts} = mapHarness({scores: [3, ...Array(11).fill(0)]});
  assert.equal(buttons[1].parts['.level-lock'].hidden, true);
  const locked = buttons[2];
  assert.equal(locked.attrs['aria-disabled'], 'true');
  assert.equal(locked.disabled, undefined, 'Native disabled would swallow the feedback click');
  assert.equal(locked.parts['.level-lock'].hidden, false);
  const before = get('#character').style.transform;
  locked.click();
  const lock = locked.parts['.level-lock'];
  const first = lock.getAnimations()[0];
  assert.equal(first.options.duration, 520);
  assert.equal(first.options.easing, 'linear');
  assert.ok(first.frames.every(frame => frame.easing === 'cubic-bezier(0.37, 0, 0.63, 1)'));
  assert.equal(first.frames[0].transform, 'rotate(0deg) scale(1)');
  assert.equal(first.frames.at(-1).transform, 'rotate(0deg) scale(1)');
  const scales = first.frames.map(frame => Number(frame.transform.match(/scale\(([^)]+)\)/)[1]));
  assert.equal(Math.max(...scales), 1.16);
  assert.ok(scales.slice(2).every((size, index, tail) => index === 0 || size < tail[index - 1]));
  locked.click();
  assert.equal(first.cancelled, true);
  assert.equal(lock.getAnimations().length, 1);
  assert.equal(locked.parts['.ice'].getAnimations().length, 0);
  assert.equal(get('#character').style.transform, before);
  assert.equal(get('#level-game').hidden, true);
  assert.deepEqual(starts, []);
  assert.match(get('#level-status').textContent, /Уровень 3 закрыт/);
});

test('Reduced motion keeps locked-level feedback and entry guard without shaking', () => {
  const {buttons, get, starts} = mapHarness({reducedMotion: true});
  buttons[1].click();
  assert.equal(buttons[1].parts['.level-lock'].getAnimations().length, 0);
  assert.match(get('#level-status').textContent, /закрыт/);
  assert.deepEqual(starts, []);
});

test('Only contiguous progress unlocks levels; available levels still launch normally', () => {
  const {buttons, get, starts} = mapHarness({scores: [3, 0, 3, ...Array(9).fill(0)]});
  assert.equal(buttons[0].attrs['aria-disabled'], 'false');
  assert.equal(buttons[1].attrs['aria-disabled'], 'false');
  buttons[2].click();
  assert.deepEqual(starts, []);
  buttons[1].click();
  assert.deepEqual(starts, [2]);
  assert.equal(get('#level-game').hidden, false);
});

test('Fixed Play action launches the character level and hides with gameplay', () => {
  const {get, starts} = mapHarness({scores:[3,2,...Array(10).fill(0)]});
  assert.equal(get('#play-current').attrs['aria-label'], 'Играть: уровень 3');
  get('#play-current').click();
  assert.deepEqual(starts,[3]);
  assert.equal(get('#map-actions').hidden,true);
});
