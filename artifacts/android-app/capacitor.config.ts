import type { CapacitorConfig } from "@capacitor/cli";

/* =====================================================================
 * SyncBeat Android wrapper — SINGLE SOURCE OF TRUTH FOR THE SITE URL
 * =====================================================================
 * The APK is a WebView wrapper around the deployed SyncBeat site.
 * To ship against a different deployment, change ONLY this value
 * (or pass it as an argument to the one-command build):
 *
 *   pnpm run build:apk -- https://your-new-render-url
 *   (sets process.env.SYNCBEAT_URL; this literal is the fallback default)
 *
 * Then the build script re-syncs Capacitor and Gradle bakes the new URL
 * into assets/capacitor.config.json inside the APK. One command, one file.
 * ===================================================================== */
export const SITE_URL: string =
  process.env.SYNCBEAT_URL ?? "https://syncbeat-vaibhav.onrender.com"; // <-- updated to new free live link

const siteHost = new URL(SITE_URL).hostname;

const config: CapacitorConfig = {
  appId: "com.syncbeat.app",
  appName: "SyncBeat",
  webDir: "web", // tiny offline-fallback page only; runtime loads server.url
  backgroundColor: "#060708",
  server: {
    url: SITE_URL, // load the live site directly (remote-content wrapper mode)
    cleartext: false, // https only
    allowNavigation: [
      siteHost,
      "*.onrender.com", // survive Render service renames without a rebuild of navigation rules
      "*.youtube.com",
      "*.ytimg.com",
      "*.google.com",
      "*.gstatic.com",
    ],
  },
  android: {
    // WebView media/autoplay + immersive behaviour live in android/app/src/main/java/com/syncbeat/app/MainActivity.java.
    allowMixedContent: false, // site and YouTube are both https — keep the WebView strict
    captureInput: true, // keep soft keyboard reliable for login/search fields
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#060708",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
    },
  },
};

export default config;
