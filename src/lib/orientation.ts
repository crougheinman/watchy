import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

/**
 * Force landscape while a video is playing, then restore.
 *
 * Native (Capacitor / Android): uses the ScreenOrientation plugin, which
 * actually rotates the device regardless of the user's auto-rotate setting.
 *
 * Web: best-effort via the Screen Orientation API. Browsers only allow a lock
 * while an element is fullscreen and reject it otherwise, so failures are
 * swallowed — the app just stays in its current orientation.
 */

const isWebOrientationSupported =
  typeof window !== 'undefined' &&
  typeof screen !== 'undefined' &&
  'orientation' in screen &&
  typeof (screen.orientation as ScreenOrientation_ | undefined)?.lock === 'function';

// Minimal shape — the DOM lib types `lock()` as optional/non-standard.
interface ScreenOrientation_ {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

export async function lockLandscape(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenOrientation.lock({ orientation: 'landscape' });
    } catch {
      /* plugin missing / unsupported — ignore */
    }
    return;
  }

  if (isWebOrientationSupported) {
    try {
      await (screen.orientation as ScreenOrientation_).lock!('landscape');
    } catch {
      /* not fullscreen / unsupported — leave orientation as-is */
    }
  }
}

export async function unlockOrientation(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenOrientation.unlock();
    } catch {
      /* ignore */
    }
    return;
  }

  if (isWebOrientationSupported) {
    try {
      (screen.orientation as ScreenOrientation_).unlock?.();
    } catch {
      /* ignore */
    }
  }
}
