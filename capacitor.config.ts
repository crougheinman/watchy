import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.watchy.app',
  appName: 'Watchy',
  webDir: 'dist',
  backgroundColor: '#0b0f0b',
  android: {
    // Video CDNs behind the player often mix http segments into the https
    // embed; the WebView blocks that by default and the video silently fails.
    allowMixedContent: true,
    webContentsDebuggingEnabled: true, // enables chrome://inspect for the WebView
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: '#0b0f0b',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',          // "DARK" = light icons, for our dark UI
      backgroundColor: '#0b0f0b',
      overlaysWebView: false,
    },
  },
};

export default config;
