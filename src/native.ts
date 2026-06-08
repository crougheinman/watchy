import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * One-time native setup. No-op on the web build, so it's safe to call
 * unconditionally from main.tsx.
 */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark }); // light icons on our dark UI
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0b0f0b' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch {
    /* StatusBar unavailable on this platform — ignore */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* no splash plugin active — ignore */
  }
}
