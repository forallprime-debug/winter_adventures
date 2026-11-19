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
    recursive: true, filter: source => !source.endsWith('preview.png')
  });
}
await mkdir(path.join(output, 'Music'), {recursive: true});
await cp(path.join(root, 'Music/duck-tales-90.m4a'), path.join(output, 'Music/duck-tales-90.m4a'));
await cp(path.join(root, 'index.html'), path.join(output, 'game.html'));
const map = (await readFile(path.join(root, 'levels.html'), 'utf8'))
  .replace('src="index.html?from=map', 'src="game.html?from=map');
await writeFile(path.join(output, 'index.html'), map);
await writeFile(path.join(output, 'levels.html'), map);
await writeFile(path.join(output, '.nojekyll'), '');
console.log('Built _site: map at /, gameplay at /game.html.');
