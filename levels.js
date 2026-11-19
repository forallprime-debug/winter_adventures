import {setTelegramBack} from './telegram.js';
// Coordinates from Figma Start (80:2622), with the full map's 200px top restored.
const points = [[74,704],[89,628],[61,554],[137,509],[207,444],[177,360],
  [103,315],[28,277],[41,195],[127,160],[209,119],[202,30]];
const viewport = document.querySelector('.map-viewport');
const space = document.querySelector('.map-space');
const map = document.querySelector('.level-map');
const character = document.querySelector('#character');
const status = document.querySelector('#level-status');
const group = document.querySelector('#level-points');
group.setAttribute('aria-busy', 'false');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let assetAttempt = 0;
const mapAsset = name => window.WinterMapAssets?.[name] || `assets/levels/${name}.webp${assetAttempt ? `?retry=${assetAttempt}` : ''}`;
const progressKey = 'game2.level-map.v1';
let scores = Array(12).fill(0);
let current = 0;
try {
  const saved = JSON.parse(localStorage.getItem(progressKey));
  if (saved && Array.isArray(saved.scores) && saved.scores.length === 12) {
    scores = saved.scores.map(n => Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0);
    current = Number.isInteger(saved.current) && saved.current >= 0 && saved.current < 12 ? saved.current : 0;
  }
} catch {}
const gameFrame = document.querySelector('#level-game');
const gameLoading = document.querySelector('#game-loading');
let selected = null;
let lastButton = null;
let scale = 1;
const buttons = points.map(([x,y], index) => {
  const button = document.createElement('button');
  button.className = 'level-point';
  button.type = 'button';
  button.style.left = `${x}px`;
  button.style.top = `${y + 200}px`;
  button.dataset.level = index + 1;
  button.innerHTML = '<img class="ice" alt="" width="62" height="57"><span class="level-number"></span><span class="level-stars" aria-hidden="true"></span>';
  button.addEventListener('click', () => launchLevel(index));
  document.querySelector('#level-points').append(button);
  return button;
});

function render() {
  buttons.forEach((button, index) => {
    const state = index === current ? 'current' : scores[index] ? 'done' : 'future';
    button.dataset.state = state;
    button.querySelector('.ice').src = mapAsset(`point-${state}`);
    button.querySelector('.level-number').textContent = state === 'current' ? '' : String(index + 1).padStart(2, '0');
    button.querySelector('.level-stars').innerHTML = state === 'done'
      ? `<img src="${mapAsset('star')}" alt="">`.repeat(scores[index]) : '';
    button.setAttribute('aria-label', `Уровень ${index + 1}: ${state === 'current' ? 'текущий' : state === 'done' ? `пройден, звёзд: ${scores[index]}` : 'ещё не пройден'}. Начать игру`);
    if (state === 'current') button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  status.textContent = `Текущий уровень ${current + 1} из 12`;
}

function characterPosition(index) {
  const [x,y] = points[index];
  return `translate(${x - 40}px, ${y + 119}px)`;
}

function revealCurrent(behavior = 'smooth') {
  const top = (points[current][1] + 119) * scale;
  const bottom = (points[current][1] + 276) * scale;
  if (top < viewport.scrollTop + 24 || bottom > viewport.scrollTop + viewport.clientHeight - 24) {
    viewport.scrollTo({top: (top + bottom - viewport.clientHeight) / 2, behavior});
  }
}

function launchLevel(index) {
  selected = index;
  setTelegramBack(() => {
    gameFrame.contentWindow.levelGame?.back();
    returnToMap();
  });
  lastButton = buttons[index];
  viewport.inert = true;
  viewport.setAttribute('aria-hidden', 'true');
  gameFrame.hidden = false;
  // Same-origin, preloaded game: preserve the tap's user activation for audio.
  const game = gameFrame.contentWindow.levelGame;
  if (game?.ready) {
    gameLoading.hidden = true;
    gameFrame.focus();
    game.start(index + 1);
  } else {
    gameLoading.hidden = false;
  }
}

window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== gameFrame.contentWindow) return;
  const data = event.data;
  if (data?.type === 'level-game-ready' && selected !== null) launchLevel(selected);
  if (data?.type === 'level-game-result' && selected !== null && data.level === selected + 1 &&
      Number.isInteger(data.stars) && data.stars >= 0 && data.stars <= 3) {
    scores[selected] = Math.max(scores[selected], data.stars);
    if (data.stars > 0) current = (selected + 1) % points.length;
    try { localStorage.setItem(progressKey, JSON.stringify({scores, current})); } catch {}
    render();
  }
  if (data?.type === 'level-game-return') returnToMap();
});

function returnToMap() {
  selected = null;
  setTelegramBack(null);
  gameFrame.hidden = true;
  gameLoading.hidden = true;
  viewport.inert = false;
  viewport.removeAttribute('aria-hidden');
  const from = character.style.transform;
  const to = characterPosition(current);
  character.style.transform = to;
  if (!reducedMotion.matches && from !== to) {
    character.animate([{transform: from}, {transform: to}], {duration: 500, easing: 'ease-in-out'});
  }
  (lastButton || buttons[current]).focus({preventScroll: true});
  revealCurrent(reducedMotion.matches ? 'instant' : 'smooth');
}

document.querySelector('#cancel-loading').onclick = returnToMap;

new ResizeObserver(() => {
  const previousScale = scale;
  const mapScroll = viewport.scrollTop / previousScale;
  const firstLayout = !space.style.height;
  scale = viewport.clientWidth / 360;
  map.style.setProperty('--map-scale', scale);
  space.style.height = `${1000 * scale}px`;
  viewport.scrollTop = firstLayout ? Math.max(0, (points[current][1] + 200) * scale - viewport.clientHeight * .7) : mapScroll * scale;
}).observe(viewport);

// Load the map before spending bandwidth on the game's music and textures.
const mapAssets = ['map', 'character', 'snowman', 'point-current', 'point-future', 'point-done', 'star'];
let loadingMap = false;
async function loadMap() {
  if (loadingMap) return;
  loadingMap = true;
  viewport.inert = true;
  const overlay = document.querySelector('#map-loading');
  const retry = document.querySelector('#retry-map');
  const label = document.querySelector('#map-loading-text');
  overlay.hidden = false;
  retry.hidden = true;
  label.textContent = 'Загружаем зимнюю карту…';
  let loaded = 0;
  const attempt = assetAttempt;
  try {
    await Promise.all(mapAssets.map(name => new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => reject(new Error('timeout')), 30000);
      image.onload = async () => {
        try {
          if (!image.naturalWidth) throw new Error('empty-image');
          // onload is sufficient; some embedded browsers reject decode() for a loaded image.
          clearTimeout(timer);
          if (loadingMap && attempt === assetAttempt) label.textContent = `Загружаем зимнюю карту… ${++loaded} / ${mapAssets.length}`;
          resolve();
        } catch (error) { clearTimeout(timer); reject(error); }
      };
      image.onerror = () => { clearTimeout(timer); reject(new Error('image')); };
      image.src = mapAsset(name);
    })));
    document.querySelector('.map-background img').src = mapAsset('map');
    document.querySelector('.snowman').src = mapAsset('snowman');
    character.src = mapAsset('character');
    render();
    document.body.classList.remove('map-pending');
    overlay.hidden = true;
    viewport.inert = false;
    // Preload only after all map artwork is ready. Taps still start music directly.
    if (!gameFrame.hasAttribute('src')) gameFrame.src = gameFrame.dataset.src;
  } catch {
    label.textContent = 'Не удалось загрузить карту. Проверь соединение и попробуй ещё раз.';
    retry.hidden = false;
  } finally { loadingMap = false; }
}
document.querySelector('#retry-map').onclick = () => { assetAttempt = Date.now(); loadMap(); };
render();
character.style.transform = characterPosition(current);
loadMap();
