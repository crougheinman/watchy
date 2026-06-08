import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open a URL outside the app's WebView.
 *
 * On native, this uses Capacitor's Browser (an Android Custom Tab), which runs
 * as a separate native surface — so it sidesteps the in-app Ad Shield that
 * blocks pop-ups and external navigations. On web it's a normal new tab.
 */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch {
      /* fall through to the web path */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
