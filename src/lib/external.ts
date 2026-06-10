import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { AppLauncher } from '@capacitor/app-launcher';

/**
 * Open a URL outside the app's WebView.
 *
 * On native we first try AppLauncher, which fires an Android ACTION_VIEW intent
 * — so a link Android knows an app for (e.g. a drive.google.com link → the
 * Google Drive app) opens in that app rather than a browser. If no app handles
 * it, we fall back to a Custom Tab, then a normal new tab. All of these run as
 * separate native surfaces, sidestepping the in-app Ad Shield.
 */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { completed } = await AppLauncher.openUrl({ url });
      if (completed) return;
    } catch {
      /* no handler / error — fall back below */
    }
    try {
      await Browser.open({ url });
      return;
    } catch {
      /* fall through to the web path */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
