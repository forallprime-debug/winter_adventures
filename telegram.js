// Telegram lives in the top-level map, while gameplay stays in a same-origin iframe.
const app = window.Telegram?.WebApp;
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

export function impact() {
  if (window.parent !== window && window.parent.WinterTelegram) {
    window.parent.WinterTelegram.impact();
  } else if (supported('6.1')) {
    attempt(() => app.HapticFeedback.impactOccurred('light'));
  } else {
    attempt(() => navigator.vibrate?.(18));
  }
}

if (window.parent === window) {
  window.WinterTelegram = {impact};
  if (app?.initData) {
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
  }
}
