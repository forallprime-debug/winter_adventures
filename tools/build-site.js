import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '_site');
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
const files = ['levels.html', 'levels.css', 'levels.js', 'telegram.js', 'forest.css',
  'forest-game.js', 'audio.js', 'rhythm.js', 'scoring.js', 'charts-duck-tales.json',
  'ui-kit.html', 'ui-kit.css', 'ui-kit.js'];
for (const file of files) await cp(path.join(root, file), path.join(output, file));
await cp(path.join(root, 'design'), path.join(output, 'design'), {recursive: true});
for (const directory of ['levels', 'winter', 'ui']) {
  await cp(path.join(root, 'assets', directory), path.join(output, 'assets', directory), {
    recursive: true, filter: source => !source.endsWith('.png')
  });
}
await mkdir(path.join(output, 'Music'), {recursive: true});
await cp(path.join(root, 'Music/duck-tales-90.m4a'), path.join(output, 'Music/duck-tales-90.m4a'));
await cp(path.join(root, 'index.html'), path.join(output, 'game.html'));
let map = (await readFile(path.join(root, 'levels.html'), 'utf8'))
  .replace('data-src="index.html?from=map', 'data-src="game.html?from=map');
// Ship the map as one response: WebViews must not need seven more successful
// CDN connections before the first screen can be drawn.
const images = {};
for (const name of ['map', 'character', 'snowman', 'point-current', 'point-future', 'point-done', 'star']) {
  const data = await readFile(path.join(root, `assets/levels/${name}.webp`));
  images[name] = `data:image/webp;base64,${data.toString('base64')}`;
  map = map.replaceAll(`src="assets/levels/${name}.webp"`, `data-map-asset="${name}"`);
}
for (const file of ['design/tokens.css', 'levels.css']) {
  const css = await readFile(path.join(root, file), 'utf8');
  const link = new RegExp(`<link rel="stylesheet" href="${file.replaceAll('.', '\\.')}[^"]*">`);
  map = map.replace(link, () => `<style>${css}</style>`);
}
const telegramCode = (await readFile(path.join(root, 'telegram.js'), 'utf8')).replaceAll('export ', '');
const mapCode = (await readFile(path.join(root, 'levels.js'), 'utf8'))
  .replace(/^import[^\n]+\n/, '');
const script = `window.WinterMapAssets=${JSON.stringify(images)};\n${telegramCode}\n${mapCode}`;
// Keep script contents literal: replacement strings interpret dollar sequences.
map = map.replace(/<script type="module" src="levels.js[^"]*"><\/script>/,
  () => `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>`);
await writeFile(path.join(output, 'index.html'), map);
await writeFile(path.join(output, 'levels.html'), map);
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built _site: map at /, gameplay at /game.html.');
