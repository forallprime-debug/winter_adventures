// Telegram lives in the top-level map, while gameplay stays in a same-origin iframe.
let app = window.Telegram?.WebApp;
let initialized = false;
const supported = version => !!app?.initData && app.isVersionAtLeast(version);
let backHandler = null;
const attempt = action => { try { action(); } catch {} };

function syncViewport() {
  const height = app?.viewportHeight;
  if (height > 0) document.documentElement.style.setProperty('--app-height', `${height}px`);
  for (const edge of ['top', 'bottom', 'left', 'right']) {
    const inset = Math.max(app?.safeAreaInset?.[edge] || 0, app?.contentSafeAreaInset?.[edge] || 0);
    document.documentElement.style.setProperty(`--app-safe-${edge}`, `${inset}px`);
  }
}

export function setTelegramBack(handler) {
  backHandler = handler;
  if (supported('6.1')) attempt(() => handler ? app.BackButton.show() : app.BackButton.hide());
}

export function impact(style = 'light') {
  if (window.parent !== window && window.parent.WinterTelegram) {
    window.parent.WinterTelegram.impact(style);
  } else if (supported('6.1')) {
    attempt(() => app.HapticFeedback.impactOccurred(style));
  } else {
    attempt(() => navigator.vibrate?.(style === 'heavy' ? 100 : 18));
  }
}

if (window.parent === window) {
  window.WinterTelegram = {impact};
  function initializeTelegram() {
    app = window.Telegram?.WebApp;
    if (!app?.initData || initialized) return;
    initialized = true;
    attempt(() => app.ready());
    attempt(() => app.expand());
    if (supported('6.1')) {
      attempt(() => app.setHeaderColor('#102b53'));
      attempt(() => app.setBackgroundColor('#102b53'));
      attempt(() => app.BackButton.onClick(() => backHandler?.()));
    }
    // The map scrolls vertically; prevent that gesture from minimizing the app.
    if (supported('7.7')) attempt(() => app.disableVerticalSwipes());
    if (supported('7.10')) attempt(() => app.setBottomBarColor('#102b53'));
    for (const event of ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged']) {
      attempt(() => app.onEvent(event, syncViewport));
    }
    attempt(() => app.onEvent('deactivated', () => {
      document.querySelector('#level-game')?.contentWindow?.levelGame?.pause();
    }));
    syncViewport();
    setTelegramBack(backHandler);
  }
  window.addEventListener('telegram-ready', initializeTelegram);
  initializeTelegram();
}

// Capture clicks before navigation and before handlers hide their buttons.
export function bindButtonHaptics() {
 document.addEventListener?.('click', event => {
  const target=event.target?.closest?.('button,a[href]');
  if(target && !target.disabled)impact();
 },true);
 document.addEventListener?.('change',event=>{
  if(event.target?.matches?.('select,input[type="range"]'))impact();
 });
}
