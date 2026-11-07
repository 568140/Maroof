// Global Back Navigation & Modal Registry for Android Back Button & Popstate Handling

export type BackHandler = () => boolean | void;

const modalHandlers: BackHandler[] = [];

/**
 * Register a modal or overlay dismiss handler.
 * Handlers are invoked LIFO (Last-In-First-Out) when the Android Back Button is pressed.
 * If the handler returns true, the event is consumed and navigation will not proceed further.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  modalHandlers.push(handler);
  return () => {
    const idx = modalHandlers.lastIndexOf(handler);
    if (idx !== -1) {
      modalHandlers.splice(idx, 1);
    }
  };
}

/**
 * Dispatches the topmost registered back handler, if any.
 * Returns true if a handler was executed and consumed the event.
 */
export function dispatchTopBackHandler(): boolean {
  if (modalHandlers.length === 0) return false;
  const topHandler = modalHandlers[modalHandlers.length - 1];
  const result = topHandler();
  // Unless explicitly returning false, consider it consumed
  return result !== false;
}

/**
 * Gets the current count of active modal handlers.
 */
export function getActiveHandlerCount(): number {
  return modalHandlers.length;
}

/**
 * Helper to push an active history guard state onto window.history
 * ensuring Android back button always fires a popstate event.
 */
export function pushHistoryGuard(): void {
  try {
    window.history.pushState({ app: 'maarouf_guard', ts: Date.now() }, '', window.location.href);
  } catch {
    // Non-blocking in restricted contexts
  }
}

/**
 * Perform application exit on Android / PWA / Browser.
 */
export function executeAppExit(): void {
  try {
    // 1. Android WebView / Capacitor / Cordova interfaces if embedded
    const win = window as any;
    if (win.Android?.exitApp && typeof win.Android.exitApp === 'function') {
      win.Android.exitApp();
      return;
    }
    if (win.navigator?.app?.exitApp && typeof win.navigator.app.exitApp === 'function') {
      win.navigator.app.exitApp();
      return;
    }
    
    // 2. Browser / PWA close
    window.close();

    // 3. If window.close() is prevented by browser security on standard tabs,
    // navigate back past the app's history or show a gentle closed screen
    if (window.history.length > 1) {
      window.history.go(-1);
    }
  } catch {
    // Fallback
  }
}
